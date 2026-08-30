/**
 * POST /api/admin/entitlement — admin entitlement operations.
 * Body: { action: 'grant'|'suspend'|'revoke'|'restore', reason: string, ... }
 *   grant:   { email, productSlug, source? ('manual_grant'|'sponsored'|'goodwill') }
 *   others:  { entitlementId }
 *
 * Server-side admin authorisation on every call; every mutation writes
 * admin_audit_log and entitlement_events in the same request. Reasons are
 * mandatory (auditable manual grants — security acceptance criterion).
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createAdminClient } from '../../../lib/supabase';
import { getSession, isAdmin, sameOriginOk } from '../../../lib/access';
import { sendTransactionalEmail } from '../../../lib/email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async (ctx) => {
  if (!sameOriginOk(ctx)) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

  const session = await getSession(ctx);
  if (!session.user) return new Response(JSON.stringify({ error: 'sign_in_required' }), { status: 401 });
  if (!(await isAdmin(session.user.id))) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  let body: {
    action?: string;
    reason?: string;
    email?: string;
    productSlug?: string;
    source?: string;
    entitlementId?: string;
    notify?: boolean;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const action = body.action ?? '';
  const reason = (body.reason ?? '').trim().slice(0, 500);
  if (!reason) return new Response(JSON.stringify({ error: 'reason_required' }), { status: 400 });

  const admin = createAdminClient();
  const actor = `admin:${session.user.id}`;

  const audit = async (auditAction: string, targetId: string, meta: Record<string, unknown>) => {
    await admin.from('admin_audit_log').insert({
      admin_user_id: session.user!.id,
      action: auditAction,
      target_table: 'entitlements',
      target_id: targetId,
      reason,
      meta,
    });
  };

  if (action === 'grant') {
    const email = (body.email ?? '').trim().toLowerCase();
    const source = ['manual_grant', 'sponsored', 'goodwill'].includes(body.source ?? '')
      ? (body.source as string)
      : 'manual_grant';
    if (!EMAIL_RE.test(email)) return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400 });

    const { data: product } = await admin
      .from('products')
      .select('id, slug, title, is_public_access')
      .eq('slug', body.productSlug ?? '')
      .single();
    if (!product) return new Response(JSON.stringify({ error: 'product_not_found' }), { status: 404 });
    if (product.is_public_access) {
      return new Response(JSON.stringify({ error: 'product_is_free_public' }), { status: 409 });
    }

    // Attach to an existing account when the email already has one.
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    const { data: ent, error } = await admin
      .from('entitlements')
      .insert({
        email,
        user_id: profile?.id ?? null,
        product_id: product.id,
        status: 'active',
        source,
        claimed_at: profile?.id ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error || !ent) return new Response(JSON.stringify({ error: 'grant_failed' }), { status: 500 });

    await admin.from('entitlement_events').insert({
      entitlement_id: ent.id, event: 'granted', reason, actor,
    });
    await audit(`entitlement_grant:${source}`, ent.id, { email, product: product.slug });

    if (body.notify) {
      await sendTransactionalEmail(admin, {
        to: email,
        template: profile?.id ? 'access_ready' : 'account_claim',
        data: {
          orderRef: 'granted access',
          productTitle: product.title,
          libraryUrl: `${new URL(ctx.request.url).origin}/library/`,
          claimUrl: `${new URL(ctx.request.url).origin}/auth/login/?email=${encodeURIComponent(email)}&claim=1`,
        },
      });
    }
    return new Response(JSON.stringify({ ok: true, entitlementId: ent.id }), { status: 200 });
  }

  if (['suspend', 'revoke', 'restore'].includes(action)) {
    const entitlementId = body.entitlementId ?? '';
    const { data: ent } = await admin
      .from('entitlements')
      .select('id, status, email, product_id')
      .eq('id', entitlementId)
      .single();
    if (!ent) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

    const newStatus = action === 'restore' ? 'active' : action === 'suspend' ? 'suspended' : 'revoked';
    const event = action === 'restore' ? 'restored' : action === 'suspend' ? 'suspended' : 'revoked';

    const { error } = await admin.from('entitlements').update({ status: newStatus }).eq('id', ent.id);
    if (error) return new Response(JSON.stringify({ error: 'update_failed' }), { status: 500 });

    await admin.from('entitlement_events').insert({ entitlement_id: ent.id, event, reason, actor });
    await audit(`entitlement_${action}`, ent.id, { from: ent.status, to: newStatus });
    return new Response(JSON.stringify({ ok: true, status: newStatus }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'unknown_action' }), { status: 400 });
};
