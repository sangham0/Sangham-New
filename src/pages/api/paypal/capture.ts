/**
 * GET /api/paypal/capture?ref=<order_ref>&token=<paypal_order_id>
 *
 * PayPal return URL. The buyer arriving here proves nothing — this endpoint
 * performs a SERVER-SIDE capture and only a COMPLETED capture (or the
 * subsequent verified webhook) fulfils the order. The buyer is then sent to
 * the success page, which reads order state from the database.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createAdminClient } from '../../../lib/supabase';
import { paypalCaptureOrder } from '../../../lib/payments/paypal';
import { applyPaymentNotification } from '../../../lib/fulfilment';

export const GET: APIRoute = async (ctx) => {
  const url = new URL(ctx.request.url);
  const orderRef = url.searchParams.get('ref') ?? '';
  const paypalOrderId = url.searchParams.get('token') ?? '';
  const successUrl = `/checkout/success/?ref=${encodeURIComponent(orderRef)}`;
  const cancelledUrl = `/checkout/cancelled/?ref=${encodeURIComponent(orderRef)}`;

  if (!orderRef || !paypalOrderId) {
    return ctx.redirect(cancelledUrl, 302);
  }

  const admin = createAdminClient();

  // The PayPal order id must match the pending order we created server-side.
  const { data: order } = await admin
    .from('orders')
    .select('id, order_ref, provider_order_ref, status')
    .eq('order_ref', orderRef)
    .eq('provider', 'paypal')
    .single();

  if (!order || order.provider_order_ref !== paypalOrderId) {
    return ctx.redirect(cancelledUrl, 302);
  }
  if (order.status === 'paid') {
    return ctx.redirect(successUrl, 302); // webhook beat us to it
  }

  try {
    const capture = await paypalCaptureOrder(paypalOrderId);
    if (capture.captured && capture.notification) {
      await applyPaymentNotification(
        admin,
        { ...capture.notification, order_ref: orderRef },
        { siteOrigin: url.origin },
      );
      return ctx.redirect(successUrl, 302);
    }
    console.log(`[paypal-capture] not completed (${capture.status}) order=${orderRef}`);
    return ctx.redirect(`${cancelledUrl}&status=incomplete`, 302);
  } catch (error) {
    console.error(`[paypal-capture] error: ${(error as Error).message}`);
    // The webhook path will reconcile if the capture actually succeeded.
    return ctx.redirect(`${cancelledUrl}&status=error`, 302);
  }
};
