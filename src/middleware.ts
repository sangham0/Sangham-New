/**
 * Astro middleware: keeps Supabase auth cookies fresh on server-rendered
 * member routes and stamps privacy headers on them. Static prerendered
 * pages are untouched.
 */

import { defineMiddleware } from 'astro:middleware';
import { createRequestClient, libraryConfigured } from './lib/supabase';

const MEMBER_PREFIXES = ['/library', '/account', '/admin', '/auth', '/api', '/checkout'];

export const onRequest = defineMiddleware(async (context, next) => {
  const path = new URL(context.request.url).pathname;
  const isMemberSurface = MEMBER_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  // Fail closed before activation: until Supabase env vars exist, every
  // member/commerce surface is unavailable rather than erroring open.
  if (isMemberSurface && !libraryConfigured()) {
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'library_not_active' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/', 302);
  }

  if (isMemberSurface && libraryConfigured()) {
    try {
      // Touch the session so expiring tokens rotate via Set-Cookie.
      const supabase = createRequestClient(context.request, context.cookies);
      await supabase.auth.getUser();
    } catch {
      /* fail open for rendering; every guard re-checks independently */
    }
  }

  const response = await next();

  if (isMemberSurface && !path.startsWith('/api/webhooks/')) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex');
  }
  return response;
});
