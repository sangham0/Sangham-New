/**
 * POST /api/admin/resend-claim — resend an account-claim/access email.
 * Body: { email: string, productSlug?: string, reason: string }
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
  if (!(await isAdmin(session.user.id))) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

  let body: { email?: string; productSlug?: string; reason?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const reason = (body.reason ?? '').trim().slice(0, 500);
  if (!EMAIL_RE.test(email) || !reason) {
    return new Response(JSON.stringify({ error: 'email_and_reason_required' }), { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ents } = await admin
    .from('entitlements')
    .select('id, product_id, user_id, products (title)')
    .ilike('email', email)
    .eq('status', 'active');

  if (!ents?.length) return new Response(JSON.stringify({ error: 'no_active_entitlements' }), { status: 404 });

  const origin = new URL(ctx.request.url).origin;
  const title = (ents[0].products as { title?: string } | null)?.title ?? 'your purchase';

  await sendTransactionalEmail(admin, {
    to: email,
    template: ents[0].user_id ? 'access_ready' : 'account_claim',
    data: {
      orderRef: 'access email resend',
      productTitle: ents.length > 1 ? `${title} (and ${ents.length - 1} more)` : title,
      libraryUrl: `${origin}/library/`,
      claimUrl: `${origin}/auth/login/?email=${encodeURIComponent(email)}&claim=1`,
    },
  });

  await admin.from('admin_audit_log').insert({
    admin_user_id: session.user.id,
    action: 'resend_claim_email',
    target_table: 'entitlements',
    target_id: ents[0].id,
    reason,
    meta: { email, entitlement_count: ents.length },
  });

  return new Response(JSON.stringify({ ok: true, count: ents.length }), { status: 200 });
};
