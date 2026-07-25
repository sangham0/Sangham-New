/**
 * GET /auth/callback — magic-link/OTP session exchange.
 * On success, claims any unclaimed entitlements bound to the verified email
 * (claim_my_entitlements is SECURITY DEFINER and self-scoped), then sends
 * the member to their destination. Expired/invalid links land back on the
 * login page with a clean re-request state.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createRequestClient } from '../../lib/supabase';

export const GET: APIRoute = async (ctx) => {
  const url = new URL(ctx.request.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next') ?? '/library/';
  const next = /^\/[a-z0-9\-/]*$/i.test(nextParam) ? nextParam : '/library/';

  const supabase = createRequestClient(ctx.request, ctx.cookies);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        await supabase.rpc('claim_my_entitlements');
      } catch {
        /* claim is retried on library load; never blocks sign-in */
      }
      return ctx.redirect(next, 302);
    }
    console.log(`[auth] code exchange failed: ${error.message}`);
  }

  return ctx.redirect(`/auth/login/?expired=1&next=${encodeURIComponent(next)}`, 302);
};
