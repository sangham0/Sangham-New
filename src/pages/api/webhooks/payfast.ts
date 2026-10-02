/**
 * POST /api/webhooks/payfast — PayFast ITN endpoint.
 *
 * Always answers 200 once the request has been safely recorded, so PayFast
 * stops retrying; fulfilment only happens after ALL FOUR official checks
 * pass (signature, source, amount, postback). Invalid notifications are
 * logged with signature_valid=false and grant nothing (fail closed).
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createAdminClient } from '../../../lib/supabase';
import { verifyPayfastItn } from '../../../lib/payments/payfast';
import { applyPaymentNotification } from '../../../lib/fulfilment';

export const POST: APIRoute = async (ctx) => {
  const rawBody = await ctx.request.text();
  const admin = createAdminClient();

  const clientIp =
    ctx.request.headers.get('x-real-ip') ??
    ctx.request.headers.get('x-forwarded-for') ??
    ctx.clientAddress ??
    null;

  try {
    const verification = await verifyPayfastItn(rawBody, clientIp, async (orderRef) => {
      const { data } = await admin
        .from('orders')
        .select('amount_cents')
        .eq('order_ref', orderRef)
        .single();
      return data?.amount_cents ?? null;
    });

    if (!verification.valid || !verification.notification) {
      // Record the failed attempt for audit; never fulfil.
      const params = new URLSearchParams(rawBody);
      await admin.from('payment_events').insert({
        provider: 'payfast',
        provider_event_id: `pf_invalid_${params.get('pf_payment_id') ?? 'unknown'}_${Date.now()}`,
        event_type: `rejected:${verification.failureReason ?? 'unknown'}`,
        signature_valid: verification.checks.signature,
        raw: {
          failure: verification.failureReason,
          checks: verification.checks,
          m_payment_id: params.get('m_payment_id'),
          payment_status: params.get('payment_status'),
        },
      });
      // 200: we received and recorded it; there is nothing to retry.
      return new Response('OK', { status: 200 });
    }

    const result = await applyPaymentNotification(admin, verification.notification, {
      siteOrigin: new URL(ctx.request.url).origin,
    });
    console.log(`[payfast-itn] ${result.action} order=${result.orderRef ?? '-'} dup=${result.duplicate}`);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error(`[payfast-itn] processing error: ${(error as Error).message}`);
    // 500 => PayFast retries; safe because processing is idempotent.
    return new Response('ERROR', { status: 500 });
  }
};
