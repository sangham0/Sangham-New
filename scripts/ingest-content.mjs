#!/usr/bin/env node
/**
 * Sangham content ingestion (run locally by the founder/operator; never in CI).
 *
 * Loads a product's content from a PRIVATE local directory into Supabase so
 * paid content never enters this public repository. The source directory
 * (env INGEST_SOURCE_DIR or --source) must contain a manifest.json:
 *
 * {
 *   "product": { "slug": "...", "type": "guide", "title": "...", "subtitle": "...",
 *                "description": "...", "price_cents": 34900, "currency": "ZAR",
 *                "price_usd_cents": 1900, "status": "unpublished",
 *                "version_label": "v1.0", "content_sha256": "..." },
 *   "course_title": "...",
 *   "modules": [
 *     { "title": "Part One", "lessons": [
 *       { "slug": "chapter-1", "title": "Chapter 1 ...", "type": "text",
 *         "file": "chapters/01.md", "free_preview": false }
 *     ] }
 *   ]
 * }
 *
 * Audio lessons use { "type": "audio", "storage_path": "guide-x/track01.mp3",
 * "bucket": "paid-assets", "duration_seconds": 900 } — upload the file to the
 * private bucket separately (Supabase dashboard or storage API).
 *
 * Requires PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment. Idempotent: re-running updates in place by slug.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const sourceDir = process.env.INGEST_SOURCE_DIR ??
  process.argv.find((a) => a.startsWith('--source='))?.slice(9);
const url = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!sourceDir || !url || !serviceKey) {
  console.error('Usage: PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/ingest-content.mjs --source=/path/to/private/content');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const manifest = JSON.parse(readFileSync(join(resolve(sourceDir), 'manifest.json'), 'utf8'));
const p = manifest.product;

console.log(`Ingesting product ${p.slug} from ${sourceDir}`);

// 1. Product (upsert by slug)
const { data: product, error: productError } = await supabase
  .from('products')
  .upsert(
    {
      slug: p.slug,
      product_type: p.type,
      title: p.title,
      subtitle: p.subtitle ?? null,
      description: p.description ?? null,
      status: p.status ?? 'unpublished',
      is_public_access: Boolean(p.is_public_access),
      price_cents: p.price_cents ?? null,
      currency: p.currency ?? null,
      price_usd_cents: p.price_usd_cents ?? null,
    },
    { onConflict: 'slug' },
  )
  .select('id')
  .single();
if (productError) throw new Error(`product upsert: ${productError.message}`);

// 2. Version record (hash discipline)
if (p.version_label) {
  const { error } = await supabase.from('product_versions').upsert(
    {
      product_id: product.id,
      version_label: p.version_label,
      content_sha256: p.content_sha256 ?? null,
      notes: p.version_notes ?? null,
    },
    { onConflict: 'product_id,version_label' },
  );
  if (error) throw new Error(`version upsert: ${error.message}`);
}

// 3. Course container
let { data: course } = await supabase
  .from('courses').select('id').eq('product_id', product.id).maybeSingle();
if (!course) {
  const { data, error } = await supabase
    .from('courses')
    .insert({ product_id: product.id, title: manifest.course_title ?? p.title })
    .select('id').single();
  if (error) throw new Error(`course insert: ${error.message}`);
  course = data;
}

// 4. Modules + lessons
let moduleSort = 0;
for (const moduleSpec of manifest.modules ?? []) {
  moduleSort += 1;
  let { data: module } = await supabase
    .from('modules').select('id')
    .eq('course_id', course.id).eq('title', moduleSpec.title).maybeSingle();
  if (!module) {
    const { data, error } = await supabase
      .from('modules')
      .insert({ course_id: course.id, title: moduleSpec.title, sort_order: moduleSort })
      .select('id').single();
    if (error) throw new Error(`module insert: ${error.message}`);
    module = data;
  }

  let lessonSort = 0;
  for (const lessonSpec of moduleSpec.lessons ?? []) {
    lessonSort += 1;
    let assetId = null;

    if (lessonSpec.type !== 'text' && lessonSpec.storage_path) {
      const { data: asset, error } = await supabase
        .from('content_assets')
        .insert({
          kind: lessonSpec.type,
          storage_bucket: lessonSpec.bucket ?? 'paid-assets',
          storage_path: lessonSpec.storage_path,
          sha256: lessonSpec.sha256 ?? null,
          mime_type: lessonSpec.mime ?? null,
        })
        .select('id').single();
      if (error) throw new Error(`asset insert: ${error.message}`);
      assetId = asset.id;
    }

    const body =
      lessonSpec.type === 'text' && lessonSpec.file
        ? readFileSync(join(resolve(sourceDir), lessonSpec.file), 'utf8')
        : null;

    const { error } = await supabase.from('lessons').upsert(
      {
        module_id: module.id,
        product_id: product.id,
        sort_order: lessonSort,
        slug: lessonSpec.slug,
        title: lessonSpec.title,
        lesson_type: lessonSpec.type,
        body_markdown: body,
        content_asset_id: assetId,
        duration_seconds: lessonSpec.duration_seconds ?? null,
        is_free_preview: Boolean(lessonSpec.free_preview),
      },
      { onConflict: 'product_id,slug' },
    );
    if (error) throw new Error(`lesson upsert (${lessonSpec.slug}): ${error.message}`);
    console.log(`  lesson ${lessonSpec.slug} (${lessonSpec.type}) ok`);
  }
}

console.log('Ingestion complete. Product remains in status:', p.status ?? 'unpublished');
console.log('Publish by setting status=published once verified in preview.');
