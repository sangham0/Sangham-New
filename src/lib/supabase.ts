/**
 * Supabase clients for the Sangham Library.
 *
 * Three access tiers:
 *  - createBrowserClient / createRequestClient: anon key + user session
 *    (RLS enforced) — safe anywhere.
 *  - createAdminClient: service-role key — SERVER ONLY. Never import from
 *    a component that renders client-side. The QA script greps built output
 *    to assert the service key never reaches the client bundle.
 */

import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/** True when Supabase env vars are present (library features enabled). */
export function libraryConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Request-scoped client carrying the caller's session cookie (RLS applies).
 */
export function createRequestClient(request: Request, cookies: AstroCookies) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY)');
  }

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '') as {
          name: string;
          value: string;
        }[];
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, {
            path: '/',
            sameSite: 'lax',
            secure: true,
            httpOnly: true,
            ...options,
          });
        }
      },
    },
  });
}

/**
 * Service-role client. SERVER ONLY. Bypasses RLS: every use must perform its
 * own authorisation check and, for admin actions, write admin_audit_log.
 */
export function createAdminClient() {
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!SUPABASE_URL || !serviceKey) {
    throw new Error('Supabase service credentials are not configured');
  }

  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export { serializeCookieHeader };
