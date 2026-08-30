#!/usr/bin/env node
/**
 * Sangham Library end-to-end smoke suite against a REAL local Supabase stack
 * (GoTrue auth + PostgREST + Storage) and the running Astro dev server.
 * Covers the security acceptance criteria that are testable pre-preview.
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const API = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP = process.env.APP_URL ?? 'http://localhost:4321';

let pass = 0, fail = 0;
const ok = (name) => { pass += 1; console.log(`ok   ${name}`); };
const bad = (name, detail) => { fail += 1; console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`); };
const check = (cond, name, detail) => (cond ? ok(name) : bad(name, detail));

const admin = createClient(API, SERVICE, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Fixtures: two users via real GoTrue admin API + magic-link verification
// ---------------------------------------------------------------------------
const stamp = Math.floor(Math.random() * 1e9);
const emailA = `buyer-a-${stamp}@test.local`;
const emailB = `buyer-b-${stamp}@test.local`;

async function realSession(email) {
  const { error: createErr } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (createErr) throw new Error(`createUser: ${createErr.message}`);
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkErr) throw new Error(`generateLink: ${linkErr.message}`);
  const client = createClient(API, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  });
  if (error) throw new Error(`verifyOtp: ${error.message}`);
  return { client, user: data.user };
}

const A = await realSession(emailA);
const B = await realSession(emailB);
ok('magic-link auth: two real sessions established via GoTrue');

const { data: profiles } = await admin.from('profiles').select('id, email').in('email', [emailA, emailB]);
check((profiles ?? []).length === 2, 'profile trigger created profiles for both users');

const { data: products } = await admin.from('products').select('id, slug').limit(20);
const bySlug = Object.fromEntries((products ?? []).map((p) => [p.slug, p.id]));

// ---------------------------------------------------------------------------
// 1. Anonymous + non-owner isolation (through the real API, RLS enforced)
// ---------------------------------------------------------------------------
const anon = createClient(API, ANON, { auth: { persistSession: false } });

{
  const { data } = await anon.from('lessons').select('slug, body_markdown').eq('slug', 'test-chapter-1');
  check((data ?? []).length === 0, 'anon cannot read paid lesson');
}
{
  const { data } = await anon.from('lessons').select('slug').eq('slug', 'test-preview');
  check((data ?? []).length === 1, 'anon reads free-preview lesson');
}
{
  const { data } = await anon.from('lessons').select('slug').eq('slug', 'test-free-track-1');
  check((data ?? []).length === 1, 'anon reads free public product lesson (never gated)');
}
{
  const { data, error } = await anon.from('orders').select('id').limit(1);
  check(Boolean(error) || (data ?? []).length === 0, 'anon cannot read orders');
}
{
  const { data: bLessons } = await B.client.from('lessons').select('slug').eq('slug', 'test-chapter-1');
  check((bLessons ?? []).length === 0, 'non-owner B cannot read paid lesson');
}

// ---------------------------------------------------------------------------
// 2. Entitlement grant -> owner access; cross-user isolation
// ---------------------------------------------------------------------------
await admin.from('entitlements').insert({
  email: emailA, user_id: A.user.id, product_id: bySlug.test_guide,
  status: 'active', source: 'manual_grant', claimed_at: new Date().toISOString(),
});
{
  const { data } = await A.client.from('lessons').select('slug, body_markdown').eq('slug', 'test-chapter-1');
  check((data ?? []).length === 1 && data[0].body_markdown?.includes('TEST paid content'),
    'owner A reads paid lesson after grant');
}
{
  const { data } = await B.client.from('entitlements').select('id');
  check((data ?? []).length === 0, 'B sees no entitlements (cannot see A\'s)');
}
{
  const { error } = await A.client.from('profiles').update({ role: 'admin' }).eq('id', A.user.id);
  check(Boolean(error), 'A cannot self-elevate to admin (column protected)');
}
{
  const { error } = await A.client.from('entitlements')
    .insert({ email: emailA, product_id: bySlug.test_audio_course, status: 'active', source: 'manual_grant' });
  check(Boolean(error), 'A cannot self-grant entitlements');
}

// ---------------------------------------------------------------------------
// 3. Claim flow: unclaimed entitlement attaches to B on rpc call
// ---------------------------------------------------------------------------
await admin.from('entitlements').insert({
  email: emailB, user_id: null, product_id: bySlug.test_audio_course,
  status: 'active', source: 'paypal_purchase',
});
{
  const { data: claimed } = await B.client.rpc('claim_my_entitlements');
  check(claimed === 1, 'B claims exactly one entitlement by verified email');
  const { data: again } = await B.client.rpc('claim_my_entitlements');
  check(again === 0, 'second claim call is a no-op (idempotent)');
  const { data: track } = await B.client.from('lessons').select('slug').eq('slug', 'test-track-1');
  check((track ?? []).length === 1, 'B reads audio-course lesson after claim');
}

// ---------------------------------------------------------------------------
// 4. Grant idempotency at the database (webhook replay safety)
// ---------------------------------------------------------------------------
{
  const { data: order } = await admin.from('orders').insert({
    email: emailB, product_id: bySlug.test_guide, amount_cents: 34900, currency: 'ZAR',
    status: 'paid', provider: 'payfast', test_mode: true,
  }).select('id').single();

  const grant = {
    email: emailB, user_id: B.user.id, product_id: bySlug.test_guide,
    status: 'active', source: 'payfast_purchase', order_id: order.id,
  };
  const first = await admin.from('entitlements')
    .upsert(grant, { onConflict: 'order_id,product_id', ignoreDuplicates: true }).select('id');
  const second = await admin.from('entitlements')
    .upsert(grant, { onConflict: 'order_id,product_id', ignoreDuplicates: true }).select('id');
  check((first.data ?? []).length === 1 && (second.data ?? []).length === 0,
    'replayed grant for same order inserts nothing (unique order/product)');

  const dupEvent = { provider: 'payfast', provider_event_id: `pf_e2e_${stamp}`, event_type: 'payment_complete' };
  const e1 = await admin.from('payment_events').insert(dupEvent);
  const e2 = await admin.from('payment_events').insert(dupEvent);
  check(!e1.error && e2.error?.code === '23505',
    'replayed payment event hits the idempotency constraint');
}

// ---------------------------------------------------------------------------
// 5. Storage: private bucket + signed URL through the app endpoint
// ---------------------------------------------------------------------------
{
  const body = new Blob([`sangham e2e test object ${stamp}`], { type: 'text/plain' });
  const up = await admin.storage.from('paid-assets').upload(`e2e/test-${stamp}.txt`, body, { upsert: true });
  check(!up.error, 'service role uploads to private bucket', up.error?.message);

  const { data: asset } = await admin.from('content_assets').insert({
    kind: 'audio', storage_bucket: 'paid-assets', storage_path: `e2e/test-${stamp}.txt`,
  }).select('id').single();
  const { data: lesson } = await admin.from('lessons')
    .update({ content_asset_id: asset.id }).eq('slug', 'test-track-1').select('id').single();

  // Direct unauthenticated access to the object must fail.
  const raw = await fetch(`${API}/storage/v1/object/paid-assets/e2e/test-${stamp}.txt`);
  check(raw.status >= 400, `direct object URL denied (${raw.status})`);

  // App endpoint: owner B gets a working signed URL...
  const bSess = (await B.client.auth.getSession()).data.session;
  const signRes = await fetch(`${APP}/api/assets/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: await appCookie(bSess),
    },
    body: JSON.stringify({ lessonId: lesson.id }),
  });
  const signJson = await signRes.json().catch(() => ({}));
  check(signRes.status === 200 && signJson.url, 'owner receives signed URL via app endpoint', JSON.stringify(signJson));
  if (signJson.url) {
    const fetched = await fetch(signJson.url.startsWith('http') ? signJson.url : `${API}${signJson.url}`);
    const text = await fetched.text();
    check(fetched.status === 200 && text.includes('e2e test object'), 'signed URL streams the object');
  }

  // ...and non-owner A is denied by the same endpoint.
  const aSess = (await A.client.auth.getSession()).data.session;
  const denyRes = await fetch(`${APP}/api/assets/sign`, {
    method: 'POST',
    headers: { "Content-Type": "application/json", Cookie: await appCookie(aSess) },
    body: JSON.stringify({ lessonId: lesson.id }),
  });
  check(denyRes.status === 403, `non-owner denied signed URL (${denyRes.status})`);

  const { data: denials } = await admin.from('access_logs').select('action').eq('action', 'denied').limit(5);
  check((denials ?? []).length >= 1, 'denial was access-logged');
}

/**
 * Build the Supabase SSR cookie header for the app from a session, using
 * @supabase/ssr's own cookie naming and encoding (no format guessing).
 */
async function appCookie(session) {
  const jar = [];
  const server = createServerClient(API, ANON, {
    cookies: { getAll: () => [], setAll: (cs) => jar.push(...cs) },
  });
  await server.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return jar.map(({ name, value }) => `${name}=${value}`).join('; ');
}

// ---------------------------------------------------------------------------
// 6. Checkout initiation through the app (PayFast sandbox credentials)
// ---------------------------------------------------------------------------
{
  const res = await fetch(`${APP}/api/checkout/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productSlug: 'test_guide', provider: 'payfast', email: `guest-${stamp}@test.local` }),
  });
  const json = await res.json().catch(() => ({}));
  const f = json.redirect?.fields ?? {};
  check(res.status === 200 && json.orderRef?.startsWith('SG-'), 'checkout/start creates pending order', JSON.stringify(json).slice(0, 200));
  check(json.redirect?.url === 'https://sandbox.payfast.co.za/eng/process', 'redirect targets PayFast sandbox');
  check(f.amount === '349.00' && f.m_payment_id === json.orderRef && Boolean(f.signature), 'server-fixed amount, order ref and signature present');

  const { data: order } = await admin.from('orders').select('status, amount_cents, currency, test_mode').eq('order_ref', json.orderRef).single();
  check(order?.status === 'pending' && order.amount_cents === 34900 && order.currency === 'ZAR' && order.test_mode === true,
    'pending order recorded server-side with correct price and test mode');

  // Client-supplied amounts must be ignored (server-fixed pricing).
  const tamper = await fetch(`${APP}/api/checkout/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productSlug: 'test_guide', provider: 'payfast', email: `guest2-${stamp}@test.local`, amount: 1 }),
  });
  const tamperJson = await tamper.json().catch(() => ({}));
  check(tamperJson.redirect?.fields?.amount === '349.00', 'client-supplied amount ignored');
}

// ---------------------------------------------------------------------------
// 7. ITN endpoint rejection paths (forged notifications grant nothing)
// ---------------------------------------------------------------------------
{
  const forged = 'm_payment_id=SG-2026-000001&pf_payment_id=999999&payment_status=COMPLETE&amount_gross=349.00&signature=deadbeefdeadbeefdeadbeefdeadbeef';
  const res = await fetch(`${APP}/api/webhooks/payfast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: forged,
  });
  check(res.status === 200, 'forged ITN acknowledged without retry loop');
  const { data: rejected } = await admin.from('payment_events')
    .select('event_type, signature_valid').like('event_type', 'rejected:%').order('created_at', { ascending: false }).limit(1);
  check(rejected?.[0]?.signature_valid === false && rejected[0].event_type.startsWith('rejected:'),
    `forged ITN recorded as ${rejected?.[0]?.event_type ?? 'MISSING'} and not fulfilled`);
}

// ---------------------------------------------------------------------------
// 8. Progress: owner writes; non-owner blocked by RLS WITH CHECK
// ---------------------------------------------------------------------------
{
  const { data: lesson } = await admin.from('lessons').select('id').eq('slug', 'test-chapter-1').single();
  const okIns = await B.client.from('course_progress')
    .upsert({ user_id: B.user.id, lesson_id: lesson.id, status: 'completed' }, { onConflict: 'user_id,lesson_id' });
  check(!okIns.error, 'owner B records progress on owned lesson', okIns.error?.message);

  const { data: videoLesson } = await admin.from('lessons').select('id').eq('slug', 'test-session-1').single();
  if (videoLesson) {
    const blocked = await A.client.from('course_progress')
      .insert({ user_id: A.user.id, lesson_id: videoLesson.id, status: 'started' });
    check(Boolean(blocked.error), 'A cannot record progress on unowned/unpublished lesson');
  } else {
    // unpublished product lessons are invisible even to service queries? (they are visible to service role)
    bad('video lesson fixture missing');
  }
}

// ---------------------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
