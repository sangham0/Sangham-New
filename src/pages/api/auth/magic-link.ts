/**
 * POST /api/auth/magic-link — request a sign-in link.
 * Body: { email: string, next?: string }
 *
 * Low-friction account system: email in, magic link out. Response is
 * intentionally identical whether or not the address is known (no account
 * enumeration). Lightly rate-limited per function instance.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createRequestClient } from '../../../lib/supabase';
import { sameOriginOk } from '../../../lib/access';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const recent = new Map<string, number[]>();

function throttled(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < 15 * 60 * 1000);
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > 5;
}

export const POST: APIRoute = async (ctx) => {
  if (!sameOriginOk(ctx)) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

  let body: { email?: string; next?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400 });
  }

  const ip = ctx.request.headers.get('x-real-ip') ?? ctx.clientAddress ?? 'unknown';
  if (throttled(`ip:${ip}`) || throttled(`em:${email}`)) {
    return new Response(JSON.stringify({ error: 'too_many_requests' }), { status: 429 });
  }

  // Only same-site relative paths may be used as post-login destinations.
  const next = typeof body.next === 'string' && /^\/[a-z0-9\-/]*$/i.test(body.next) ? body.next : '/library/';

  const supabase = createRequestClient(ctx.request, ctx.cookies);
  const origin = new URL(ctx.request.url).origin;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback/?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error(`[auth] magic link error: ${error.message}`);
    // Same response shape either way (no enumeration); genuine outages
    // surface via server logs.
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
