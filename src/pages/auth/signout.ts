/**
 * POST /auth/signout — clear the session server-side. POST-only (CSRF
 * discipline); the account page submits a small form.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createRequestClient } from '../../lib/supabase';
import { sameOriginOk } from '../../lib/access';

export const POST: APIRoute = async (ctx) => {
  if (!sameOriginOk(ctx)) return new Response('forbidden', { status: 403 });
  const supabase = createRequestClient(ctx.request, ctx.cookies);
  await supabase.auth.signOut();
  return ctx.redirect('/', 302);
};
