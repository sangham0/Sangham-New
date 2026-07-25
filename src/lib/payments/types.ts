/**
 * Provider-neutral payment types.
 *
 * Core principle : the gateway reports payment state; Sangham owns
 * orders, customers, entitlements, fulfilment and audit history. Nothing in
 * access control ever depends on which provider took the payment.
 */

export type PaymentProvider = 'payfast' | 'paypal';

export interface PendingOrder {
  id: string;
  order_ref: string;
  email: string;
  product_id: string;
  amount_cents: number;
  currency: string;
  provider: PaymentProvider;
  test_mode: boolean;
}

export interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  price_cents: number;
  currency: string;
}

/** What the checkout page needs to hand the buyer to the gateway. */
export interface CheckoutRedirect {
  /** Where the buyer's browser goes. */
  url: string;
  /** For form-POST gateways (PayFast): hidden fields to submit. */
  method: 'GET' | 'POST';
  fields?: Record<string, string>;
}

/**
 * A verified, normalised provider notification. Produced ONLY after
 * signature/source/amount validation has passed inside the adapter.
 */
export interface VerifiedPaymentNotification {
  provider: PaymentProvider;
  /** Provider-unique event id — idempotency key (unique per provider). */
  provider_event_id: string;
  /** Our order_ref (m_payment_id / reference_id). */
  order_ref: string | null;
  event_type:
    | 'payment_complete'
    | 'payment_failed'
    | 'payment_cancelled'
    | 'refund'
    | 'reversal'
    | 'other';
  amount_cents: number | null;
  currency: string | null;
  /** Raw payload with secrets/signatures stripped, for the audit trail. */
  raw: Record<string, unknown>;
}
