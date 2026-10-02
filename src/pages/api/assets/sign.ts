/**
 * POST /api/assets/sign — entitlement-checked short-lived signed URL.
 * Body: { lessonId: string }
 *
 * The client never sees storage paths for other assets and never lists
 * buckets. Every issuance and every denial is access-logged.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createAdminClient } from '../../../lib/supabase';
import { getSession, logAccess, sameOriginOk, signProtectedAsset, userOwnsProduct } from '../../../lib/access';

export const POST: APIRoute = async (ctx) => {
  if (!sameOriginOk(ctx)) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

  let body: { lessonId?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }
  const lessonId = typeof body.lessonId === 'string' ? body.lessonId.slice(0, 60) : '';
  if (!lessonId) return new Response(JSON.stringify({ error: 'missing_lesson' }), { status: 400 });

  const ip = ctx.request.headers.get('x-real-ip') ?? ctx.clientAddress ?? null;
  const ua = ctx.request.headers.get('user-agent');
  const session = await getSession(ctx);

  // Look up the lesson + asset with the service client (paths are not
  // client-readable), then decide access explicitly.
  const admin = createAdminClient();
  const { data: lesson } = await admin
    .from('lessons')
    .select('id, product_id, is_free_preview, content_asset_id, content_assets (id, kind, storage_bucket, storage_path), products!lessons_product_id_fkey (id, status, is_public_access)')
    .eq('id', lessonId)
    .single();

  const asset = (lesson?.content_assets ?? null) as
    | { id: string; kind: string; storage_bucket: string | null; storage_path: string | null }
    | null;
  const product = (lesson?.products ?? null) as
    | { id: string; status: string; is_public_access: boolean }
    | null;

  const deny = async (status: number, reason: string) => {
    await logAccess({
      userId: session.user?.id ?? null,
      productId: product?.id ?? null,
      lessonId,
      assetId: asset?.id ?? null,
      action: 'denied',
      ip,
      userAgent: ua,
    });
    return new Response(JSON.stringify({ error: reason }), { status });
  };

  if (!lesson || !asset?.storage_path || !asset.storage_bucket || !product) {
    return deny(404, 'not_found');
  }
  if (product.status !== 'published') return deny(404, 'not_found');

  const isPublic = product.is_public_access || lesson.is_free_preview;
  if (!isPublic) {
    if (!session.user) return deny(401, 'sign_in_required');
    const owns = await userOwnsProduct(session.supabase, product.id);
    if (!owns) return deny(403, 'no_entitlement');
  }

  const signedUrl = await signProtectedAsset(asset.storage_path, asset.storage_bucket);
  if (!signedUrl) return deny(500, 'signing_failed');

  await logAccess({
    userId: session.user?.id ?? null,
    productId: product.id,
    lessonId,
    assetId: asset.id,
    action: 'sign_url',
    ip,
    userAgent: ua,
  });

  return new Response(JSON.stringify({ url: signedUrl }), {
    status: 200,
    headers: { 'Cache-Control': 'private, no-store' },
  });
};
