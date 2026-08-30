/**
 * Fulfilment: turns verified payment notifications into order state changes
 * and entitlements, idempotently. This is the ONLY code path that grants
 * purchase entitlements. Browser return URLs never reach this module without
 * a server-verified capture/notification.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { VerifiedPaymentNotification } from './payments/types';
import { sendTransactionalEmail } from './email';

export interface FulfilmentResult {
  ok: boolean;
  duplicate: boolean;
  orderRef: string | null;
  action: string;
}

/**
 * Record a verified notification and apply its consequences.
 * Idempotency: the (provider, provider_event_id) unique constraint means a
 * replayed notification records nothing and changes nothing.
 */
export async function applyPaymentNotification(
  admin: SupabaseClient,
  notification: VerifiedPaymentNotification,
  options: { siteOrigin: string },
): Promise<FulfilmentResult> {
  // 1. Insert the payment event (idempotency gate).
  const { error: eventError } = await admin.from('payment_events').insert({
    provider: notification.provider,
    provider_event_id: notification.provider_event_id,
    event_type: notification.event_type,
    amount_cents: notification.amount_cents,
    currency: notification.currency,
    signature_valid: true,
    raw: notification.raw,
    processed_at: new Date().toISOString(),
  });

  if (eventError) {
    if (eventError.code === '23505') {
      // Unique violation: already processed. Replay is harmless.
      return { ok: true, duplicate: true, orderRef: notification.order_ref, action: 'duplicate_ignored' };
    }
    throw new Error(`payment_events insert failed: ${eventError.message}`);
  }

  // 2. Resolve the order.
  let orderQuery = admin.from('orders').select('*').limit(1);
  if (notification.order_ref) {
    orderQuery = orderQuery.eq('order_ref', notification.order_ref);
  } else if (notification.raw.related_order_id) {
    orderQuery = orderQuery
      .eq('provider', notification.provider)
      .eq('provider_order_ref', String(notification.raw.related_order_id));
  } else {
    return { ok: true, duplicate: false, orderRef: null, action: 'no_order_reference_logged_only' };
  }

  const { data: orders, error: orderError } = await orderQuery;
  if (orderError) throw new Error(`order lookup failed: ${orderError.message}`);
  const order = orders?.[0];
  if (!order) {
    // Unknown order: keep the event for audit, alert, grant nothing.
    return { ok: true, duplicate: false, orderRef: notification.order_ref, action: 'unknown_order_logged_only' };
  }

  // Link the event to the order for the audit trail.
  await admin
    .from('payment_events')
    .update({ order_id: order.id })
    .eq('provider', notification.provider)
    .eq('provider_event_id', notification.provider_event_id);

  switch (notification.event_type) {
    case 'payment_complete':
      return fulfilPaidOrder(admin, order, notification, options);

    case 'payment_failed':
      if (order.status === 'pending') {
        await admin.from('orders').update({ status: 'failed' }).eq('id', order.id);
      }
      return { ok: true, duplicate: false, orderRef: order.order_ref, action: 'order_failed' };

    case 'payment_cancelled':
      if (order.status === 'pending') {
        await admin.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
      }
      return { ok: true, duplicate: false, orderRef: order.order_ref, action: 'order_cancelled' };

    case 'refund':
    case 'reversal': {
      await admin.from('orders').update({ status: 'refunded' }).eq('id', order.id);
      // Entitlement consequence: suspend (reversible) pending the founder's
      // approved customer-facing revocation policy. Nothing is deleted.
      const { data: ents } = await admin
        .from('entitlements')
        .select('id, status')
        .eq('order_id', order.id);
      for (const ent of ents ?? []) {
        if (ent.status === 'active') {
          await admin.from('entitlements').update({ status: 'suspended' }).eq('id', ent.id);
          await admin.from('entitlement_events').insert({
            entitlement_id: ent.id,
            event: 'suspended',
            reason: `${notification.event_type} (${notification.provider} ${notification.provider_event_id})`,
            actor: `webhook:${notification.provider}`,
          });
        }
      }
      return { ok: true, duplicate: false, orderRef: order.order_ref, action: 'refund_recorded_entitlement_suspended' };
    }

    default:
      return { ok: true, duplicate: false, orderRef: order.order_ref, action: 'event_logged' };
  }
}

async function fulfilPaidOrder(
  admin: SupabaseClient,
  order: {
    id: string;
    order_ref: string;
    email: string;
    user_id: string | null;
    product_id: string;
    amount_cents: number;
    status: string;
  },
  notification: VerifiedPaymentNotification,
  options: { siteOrigin: string },
): Promise<FulfilmentResult> {
  // Server-side amount re-validation (adapters check too; defence in depth).
  if (
    notification.amount_cents !== null &&
    Math.abs(notification.amount_cents - order.amount_cents) > 1
  ) {
    return { ok: false, duplicate: false, orderRef: order.order_ref, action: 'amount_mismatch_not_fulfilled' };
  }

  if (order.status !== 'paid') {
    await admin.from('orders').update({ status: 'paid' }).eq('id', order.id);
  }

  // Idempotent entitlement grant: unique (order_id, product_id).
  const source = notification.provider === 'payfast' ? 'payfast_purchase' : 'paypal_purchase';
  const { data: granted, error: grantError } = await admin
    .from('entitlements')
    .upsert(
      {
        email: order.email,
        user_id: order.user_id,
        product_id: order.product_id,
        status: 'active',
        source,
        order_id: order.id,
        claimed_at: order.user_id ? new Date().toISOString() : null,
      },
      { onConflict: 'order_id,product_id', ignoreDuplicates: true },
    )
    .select('id');

  if (grantError) throw new Error(`entitlement grant failed: ${grantError.message}`);

  const entitlementId = granted?.[0]?.id;
  if (entitlementId) {
    await admin.from('entitlement_events').insert({
      entitlement_id: entitlementId,
      event: 'granted',
      reason: `verified ${notification.provider} payment (${notification.provider_event_id})`,
      actor: `webhook:${notification.provider}`,
    });

    // Transactional email: payment confirmation + access (claim link for
    // new customers, direct library link for existing members).
    const { data: product } = await admin
      .from('products')
      .select('title, slug')
      .eq('id', order.product_id)
      .single();

    await sendTransactionalEmail(admin, {
      to: order.email,
      template: order.user_id ? 'access_ready' : 'account_claim',
      data: {
        orderRef: order.order_ref,
        productTitle: product?.title ?? 'your purchase',
        libraryUrl: `${options.siteOrigin}/library/`,
        claimUrl: `${options.siteOrigin}/auth/login/?email=${encodeURIComponent(order.email)}&claim=1`,
      },
    });
  }

  return {
    ok: true,
    duplicate: false,
    orderRef: order.order_ref,
    action: entitlementId ? 'order_paid_entitlement_granted' : 'order_paid_entitlement_already_existed',
  };
}
