/**
 * PayFast adapter (South Africa) — redirect checkout + ITN verification.
 *
 * Facts and rules sourced from the current official PayFast developer
 * documentation:
 *  - Checkout signature: MD5 over the fields IN THE ORDER POSTED, values
 *    URL-encoded with UPPERCASE hex and spaces as '+', passphrase appended.
 *  - ITN verification requires ALL FOUR checks: signature, source host,
 *    amount match (±R0.01), and a server-to-server postback to
 *    /eng/query/validate returning VALID.
 *  - Respond HTTP 200 to ITN or PayFast keeps retrying.
 */

import { createHash } from 'node:crypto';
import { resolve4 } from 'node:dns/promises';
import type { CheckoutRedirect, PendingOrder, VerifiedPaymentNotification } from './types';

const LIVE_HOST = 'www.payfast.co.za';
const SANDBOX_HOST = 'sandbox.payfast.co.za';

/** Official PayFast ITN source domains (validated by DNS resolution). */
const ITN_SOURCE_DOMAINS = [
  'www.payfast.co.za',
  'w1w.payfast.co.za',
  'w2w.payfast.co.za',
  'sandbox.payfast.co.za',
];

interface PayfastConfig {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  mode: 'sandbox' | 'live';
}

export function payfastConfig(): PayfastConfig | null {
  const merchantId = import.meta.env.PAYFAST_MERCHANT_ID as string | undefined;
  const merchantKey = import.meta.env.PAYFAST_MERCHANT_KEY as string | undefined;
  const passphrase = import.meta.env.PAYFAST_PASSPHRASE as string | undefined;
  const mode = (import.meta.env.PAYFAST_MODE as string | undefined) === 'live' ? 'live' : 'sandbox';
  if (!merchantId || !merchantKey || !passphrase) return null;
  return { merchantId, merchantKey, passphrase, mode };
}

/**
 * PayFast's URL encoding: encodeURIComponent, but spaces become '+' and hex
 * escapes are uppercase (encodeURIComponent already emits uppercase hex).
 */
function pfEncode(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%20/g, '+');
}

/**
 * Signature over fields in insertion order (checkout) or received order
 * (ITN), excluding empty values and the signature field itself, with the
 * passphrase appended.
 */
export function payfastSignature(
  fields: Array<[string, string]>,
  passphrase: string,
): string {
  const parts: string[] = [];
  for (const [key, value] of fields) {
    if (key === 'signature') continue;
    if (value === undefined || value === null || value === '') continue;
    parts.push(`${key}=${pfEncode(value)}`);
  }
  parts.push(`passphrase=${pfEncode(passphrase)}`);
  return createHash('md5').update(parts.join('&')).digest('hex');
}

/**
 * Build the redirect form for a pending order. Field order follows the
 * official attribute ordering (merchant, urls, buyer, transaction).
 */
export function payfastCheckoutRedirect(
  order: PendingOrder,
  productTitle: string,
  siteOrigin: string,
): CheckoutRedirect {
  const cfg = payfastConfig();
  if (!cfg) throw new Error('PayFast is not configured');
  if (order.currency !== 'ZAR') {
    throw new Error('PayFast charges in ZAR only');
  }

  const host = cfg.mode === 'live' ? LIVE_HOST : SANDBOX_HOST;
  const amount = (order.amount_cents / 100).toFixed(2);

  // Insertion order matters for the signature.
  const fields: Array<[string, string]> = [
    ['merchant_id', cfg.merchantId],
    ['merchant_key', cfg.merchantKey],
    ['return_url', `${siteOrigin}/checkout/success/?ref=${encodeURIComponent(order.order_ref)}`],
    ['cancel_url', `${siteOrigin}/checkout/cancelled/?ref=${encodeURIComponent(order.order_ref)}`],
    ['notify_url', `${siteOrigin}/api/webhooks/payfast`],
    ['email_address', order.email],
    ['m_payment_id', order.order_ref],
    ['amount', amount],
    ['item_name', productTitle.slice(0, 100)],
  ];

  const signature = payfastSignature(fields, cfg.passphrase);
  const fieldMap: Record<string, string> = Object.fromEntries(fields);
  fieldMap.signature = signature;

  return {
    url: `https://${host}/eng/process`,
    method: 'POST',
    fields: fieldMap,
  };
}

/** Result of ITN verification with the reason recorded for the audit row. */
export interface ItnVerification {
  valid: boolean;
  checks: {
    signature: boolean;
    source: boolean;
    amount: boolean;
    postback: boolean;
  };
  failureReason?: string;
  notification?: VerifiedPaymentNotification;
}

function stripSecrets(params: Record<string, string>): Record<string, string> {
  const raw = { ...params };
  delete raw.signature;
  delete raw.merchant_key;
  return raw;
}

/**
 * Verify a PayFast ITN POST. Performs all four official checks.
 *
 * @param rawBody   the exact URL-encoded request body (order preserved)
 * @param remoteHint value of the client IP as reported by the platform
 * @param expectedAmountCents amount of the referenced order (checked ±1c)
 */
export async function verifyPayfastItn(
  rawBody: string,
  remoteHint: string | null,
  lookupOrderAmountCents: (orderRef: string) => Promise<number | null>,
): Promise<ItnVerification> {
  const cfg = payfastConfig();
  if (!cfg) {
    return {
      valid: false,
      checks: { signature: false, source: false, amount: false, postback: false },
      failureReason: 'payfast_not_configured',
    };
  }

  // Parse preserving order.
  const orderedFields: Array<[string, string]> = [];
  const params: Record<string, string> = {};
  for (const pair of rawBody.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = decodeURIComponent(eq === -1 ? pair : pair.slice(0, eq));
    const value = eq === -1 ? '' : decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, '%20'));
    orderedFields.push([key, value]);
    params[key] = value;
  }

  const checks = { signature: false, source: false, amount: false, postback: false };

  // 1. Signature (received field order + passphrase)
  const expectedSig = payfastSignature(orderedFields, cfg.passphrase);
  checks.signature = Boolean(params.signature) &&
    params.signature.toLowerCase() === expectedSig.toLowerCase();
  if (!checks.signature) {
    return { valid: false, checks, failureReason: 'signature_mismatch' };
  }

  // 2. Source validation: resolve official PayFast domains and compare.
  try {
    const validIps = new Set<string>();
    await Promise.all(
      ITN_SOURCE_DOMAINS.map(async (domain) => {
        try {
          for (const ip of await resolve4(domain)) validIps.add(ip);
        } catch {
          /* domain temporarily unresolvable — others still checked */
        }
      }),
    );
    checks.source = remoteHint !== null && validIps.has(remoteHint.split(',')[0].trim());
  } catch {
    checks.source = false;
  }
  if (!checks.source) {
    return { valid: false, checks, failureReason: 'source_ip_not_payfast' };
  }

  // 3. Amount check against our order (±1 cent per official guidance)
  const orderRef = params.m_payment_id ?? '';
  const expectedCents = await lookupOrderAmountCents(orderRef);
  const grossCents = Math.round(parseFloat(params.amount_gross ?? '') * 100);
  checks.amount =
    expectedCents !== null && Number.isFinite(grossCents) &&
    Math.abs(grossCents - expectedCents) <= 1;
  if (!checks.amount) {
    return { valid: false, checks, failureReason: 'amount_mismatch_or_unknown_order' };
  }

  // 4. Server postback confirmation
  const host = cfg.mode === 'live' ? LIVE_HOST : SANDBOX_HOST;
  try {
    const response = await fetch(`https://${host}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: rawBody,
    });
    const text = (await response.text()).trim();
    checks.postback = text.startsWith('VALID');
  } catch {
    checks.postback = false;
  }
  if (!checks.postback) {
    return { valid: false, checks, failureReason: 'postback_not_valid' };
  }

  const status = (params.payment_status ?? '').toUpperCase();
  const eventType =
    status === 'COMPLETE' ? 'payment_complete'
    : status === 'FAILED' ? 'payment_failed'
    : status === 'CANCELLED' ? 'payment_cancelled'
    : 'other';

  return {
    valid: true,
    checks,
    notification: {
      provider: 'payfast',
      provider_event_id: `pf_${params.pf_payment_id ?? 'unknown'}_${status.toLowerCase()}`,
      order_ref: orderRef || null,
      event_type: eventType,
      amount_cents: grossCents,
      currency: 'ZAR',
      raw: stripSecrets(params),
    },
  };
}
