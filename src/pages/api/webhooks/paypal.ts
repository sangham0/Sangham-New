/**
 * POST /api/webhooks/paypal — PayPal webhook endpoint.
 *
 * Signature is verified with PayPal's verify-webhook-signature API before
 * anything is trusted. Processing is idempotent (event id unique), so
 * PayPal's retries (up to 25 over 3 days) are harmless.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createAdminClient } from '../../../lib/supabase';
import { verifyPaypalWebhook } from '../../../lib/payments/paypal';
import { applyPaymentNotification } from '../../../lib/fulfilment';

export const POST: APIRoute = async (ctx) => {
  const rawBody = await ctx.request.text();
  const admin = createAdminClient();

  try {
    const notification = await verifyPaypalWebhook(ctx.request.headers, rawBody);

    if (!notification) {
      // Unverifiable: record minimal audit row, grant nothing.
      let eventId = 'unknown';
      try {
        eventId = String((JSON.parse(rawBody) as { id?: string }).id ?? 'unknown');
      } catch {
        /* unparseable body */
      }
      await admin.from('payment_events').insert({
        provider: 'paypal',
        provider_event_id: `pp_unverified_${eventId}`,
        event_type: 'rejected:signature_unverified',
        signature_valid: false,
        raw: { note: 'webhook signature verification failed or not configured' },
      });
      // 200 so PayPal does not retry an event we will never accept.
      return new Response('OK', { status: 200 });
    }

    const result = await applyPaymentNotification(admin, notification, {
      siteOrigin: new URL(ctx.request.url).origin,
    });
    console.log(`[paypal-webhook] ${result.action} order=${result.orderRef ?? '-'} dup=${result.duplicate}`);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error(`[paypal-webhook] processing error: ${(error as Error).message}`);
    return new Response('ERROR', { status: 500 });
  }
};
