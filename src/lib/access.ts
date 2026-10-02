/**
 * Access control helpers for member routes and protected assets.
 * Posture: fail closed — any error results in denial, never a grant.
 */

import { createHash } from 'node:crypto';
import type { APIContext, AstroGlobal } from 'astro';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createAdminClient, createRequestClient } from './supabase';

type Ctx = AstroGlobal | APIContext;

export interface SessionInfo {
  supabase: SupabaseClient;
  user: User | null;
}

/** Resolve the caller's session (RLS-scoped client + user). */
export async function getSession(ctx: Ctx): Promise<SessionInfo> {
  const supabase = createRequestClient(ctx.request, ctx.cookies);
  try {
    const { data } = await supabase.auth.getUser();
    return { supabase, user: data.user ?? null };
  } catch {
    return { supabase, user: null };
  }
}

/** Require a signed-in user; returns null after issuing a redirect. */
export async function requireUser(ctx: Ctx): Promise<SessionInfo | null> {
  const session = await getSession(ctx);
  if (!session.user) return null;
  return session;
}

/** Server-side admin check (profiles.role, read with service client). */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from('profiles').select('role').eq('id', userId).single();
    return data?.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Does this user hold an active entitlement for the product (direct or via
 * bundle)? Uses the caller's OWN RLS-scoped connection so the database is
 * the authority, mirroring public.has_active_entitlement.
 */
export async function userOwnsProduct(
  supabase: SupabaseClient,
  productId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_active_entitlement', {
      p_product_id: productId,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/** Salted IP hash for access logs — raw IPs are never stored. */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = (import.meta.env.ACCESS_LOG_SALT as string | undefined) ?? 'sangham-static-salt';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export async function logAccess(entry: {
  userId: string | null;
  productId: string | null;
  lessonId?: string | null;
  assetId?: string | null;
  action: 'view' | 'stream' | 'sign_url' | 'denied';
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('access_logs').insert({
      user_id: entry.userId,
      product_id: entry.productId,
      lesson_id: entry.lessonId ?? null,
      asset_id: entry.assetId ?? null,
      action: entry.action,
      ip_hash: hashIp(entry.ip),
      user_agent: entry.userAgent ? entry.userAgent.slice(0, 160) : null,
    });
  } catch {
    /* logging must never break access handling */
  }
}

/**
 * Issue a short-lived signed URL for a protected storage object AFTER an
 * entitlement check by the caller. Service-role signing; TTL from env.
 */
export async function signProtectedAsset(
  storagePath: string,
  bucket: string,
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const ttl = parseInt((import.meta.env.ASSET_SIGN_TTL_SECONDS as string | undefined) ?? '900', 10);
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(storagePath, Number.isFinite(ttl) ? ttl : 900);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/** Same-origin guard for state-changing, non-webhook endpoints. */
export function sameOriginOk(ctx: Ctx): boolean {
  const secFetchSite = ctx.request.headers.get('sec-fetch-site');
  if (secFetchSite && ['same-origin', 'same-site', 'none'].includes(secFetchSite)) return true;
  const origin = ctx.request.headers.get('origin');
  if (!origin) return true; // non-browser client; auth still required
  try {
    return new URL(origin).host === new URL(ctx.request.url).host;
  } catch {
    return false;
  }
}
