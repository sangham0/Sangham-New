/**
 * PayPal adapter — Orders API v2, server-side create and capture, webhook
 * signature verification.
 *
 * Access is NEVER granted from the browser return URL: the return handler
 * performs a server-side capture and the webhook reconciles independently.
 * Flow verified against current official PayPal developer documentation.
 */

import type { CheckoutRedirect, PendingOrder, VerifiedPaymentNotification } from './types';

interface PaypalConfig {
  clientId: string;
  clientSecret: string;
  webhookId: string | null;
  mode: 'sandbox' | 'live';
  apiBase: string;
}

export function paypalConfig(): PaypalConfig | null {
  const clientId = import.meta.env.PAYPAL_CLIENT_ID as string | undefined;
  const clientSecret = import.meta.env.PAYPAL_CLIENT_SECRET as string | undefined;
  const webhookId = (import.meta.env.PAYPAL_WEBHOOK_ID as string | undefined) ?? null;
  const mode = (import.meta.env.PAYPAL_MODE as string | undefined) === 'live' ? 'live' : 'sandbox';
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    webhookId,
    mode,
    apiBase: mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
  };
}

async function accessToken(cfg: PaypalConfig): Promise<string> {
  const response = await fetch(`${cfg.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) throw new Error(`PayPal token request failed: ${response.status}`);
  const json = (await response.json()) as { access_token: string };
  return json.access_token;
}

/**
 * Create a PayPal order server-side and return the buyer approval link.
 * reference_id carries our order_ref so every later event maps back.
 */
export async function paypalCheckoutRedirect(
  order: PendingOrder,
  productTitle: string,
  siteOrigin: string,
): Promise<{ redirect: CheckoutRedirect; providerOrderId: string }> {
  const cfg = paypalConfig();
  if (!cfg) throw new Error('PayPal is not configured');

  const token = await accessToken(cfg);
  const response = await fetch(`${cfg.apiBase}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Idempotent create per order.
      'PayPal-Request-Id': `sangham-${order.order_ref}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: order.order_ref,
          description: productTitle.slice(0, 120),
          amount: {
            currency_code: order.currency,
            value: (order.amount_cents / 100).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'Sangham',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${siteOrigin}/api/paypal/capture?ref=${encodeURIComponent(order.order_ref)}`,
        cancel_url: `${siteOrigin}/checkout/cancelled/?ref=${encodeURIComponent(order.order_ref)}`,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`PayPal order creation failed: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as {
    id: string;
    links: Array<{ rel: string; href: string }>;
  };
  const approve = json.links.find((l) => l.rel === 'approve' || l.rel === 'payer-action');
  if (!approve) throw new Error('PayPal order has no approval link');

  return {
    redirect: { url: approve.href, method: 'GET' },
    providerOrderId: json.id,
  };
}

export interface CaptureResult {
  captured: boolean;
  notification?: VerifiedPaymentNotification;
  status?: string;
}

/**
 * Capture an approved PayPal order server-side. The capture response is the
 * authoritative confirmation used for fulfilment; the webhook re-confirms.
 */
export async function paypalCaptureOrder(providerOrderId: string): Promise<CaptureResult> {
  const cfg = paypalConfig();
  if (!cfg) throw new Error('PayPal is not configured');

  const token = await accessToken(cfg);
  const response = await fetch(`${cfg.apiBase}/v2/checkout/orders/${providerOrderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `sangham-capture-${providerOrderId}`,
    },
  });

  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const status = String((json as { status?: string }).status ?? response.status);

  if (!response.ok || status !== 'COMPLETED') {
    return { captured: false, status };
  }

  const pu = (json as {
    purchase_units?: Array<{
      reference_id?: string;
      payments?: { captures?: Array<{ id: string; amount?: { value: string; currency_code: string } }> };
    }>;
  }).purchase_units?.[0];
  const capture = pu?.payments?.captures?.[0];

  return {
    captured: true,
    status,
    notification: {
      provider: 'paypal',
      provider_event_id: `pp_capture_${capture?.id ?? providerOrderId}`,
      order_ref: pu?.reference_id ?? null,
      event_type: 'payment_complete',
      amount_cents: capture?.amount ? Math.round(parseFloat(capture.amount.value) * 100) : null,
      currency: capture?.amount?.currency_code ?? null,
      raw: { paypal_order_id: providerOrderId, capture_id: capture?.id, status },
    },
  };
}

/**
 * Verify a PayPal webhook using the official verify-webhook-signature call,
 * then normalise the event. Returns null when verification fails.
 */
export async function verifyPaypalWebhook(
  headers: Headers,
  rawBody: string,
): Promise<VerifiedPaymentNotification | null> {
  const cfg = paypalConfig();
  if (!cfg || !cfg.webhookId) return null;

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }

  const token = await accessToken(cfg);
  const verifyResponse = await fetch(`${cfg.apiBase}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: cfg.webhookId,
      webhook_event: event,
    }),
  });
  if (!verifyResponse.ok) return null;
  const verdict = (await verifyResponse.json()) as { verification_status?: string };
  if (verdict.verification_status !== 'SUCCESS') return null;

  const eventType = String(event.event_type ?? '');
  const resource = (event.resource ?? {}) as {
    id?: string;
    status?: string;
    amount?: { value?: string; currency_code?: string };
    custom_id?: string;
    invoice_id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
  };

  let normalised: VerifiedPaymentNotification['event_type'] = 'other';
  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') normalised = 'payment_complete';
  else if (eventType === 'PAYMENT.CAPTURE.REFUNDED') normalised = 'refund';
  else if (eventType === 'PAYMENT.CAPTURE.REVERSED' || eventType === 'CUSTOMER.DISPUTE.CREATED') normalised = 'reversal';
  else if (eventType === 'PAYMENT.CAPTURE.DENIED') normalised = 'payment_failed';

  return {
    provider: 'paypal',
    provider_event_id: `pp_event_${String(event.id ?? resource.id ?? 'unknown')}`,
    // order_ref resolution happens in the webhook route via the stored
    // provider_order_ref (purchase unit reference is not present on all
    // capture events).
    order_ref: null,
    event_type: normalised,
    amount_cents: resource.amount?.value ? Math.round(parseFloat(resource.amount.value) * 100) : null,
    currency: resource.amount?.currency_code ?? null,
    raw: {
      event_type: eventType,
      event_id: event.id,
      resource_id: resource.id,
      related_order_id: resource.supplementary_data?.related_ids?.order_id,
      status: resource.status,
    },
  };
}
