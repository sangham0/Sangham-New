/**
 * Transactional email adapter.
 *
 * Providers:
 *  - 'log' (default): records the send in the database and server log,
 *    delivers nothing. Safe for development, preview and pre-approval use.
 *  - 'resend': HTTP API send. Activated ONLY once the founder has approved
 *    an email provider and a Sangham sending identity (decision packet).
 *
 * Rules (EMAIL_CONSENT_AND_CUSTOMER_OPERATIONS.md, private repo):
 *  - transactional only here; newsletter mail is a separate consent-gated
 *    stream and is NOT implemented as a send path in this mission;
 *  - a purchase never creates marketing consent;
 *  - no live customer email during testing except authorised test accounts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type TemplateName =
  | 'account_claim'
  | 'access_ready'
  | 'payment_confirmation'
  | 'refund_processed'
  | 'access_changed';

interface SendInput {
  to: string;
  template: TemplateName;
  data: Record<string, string>;
}

interface RenderedEmail {
  subject: string;
  text: string;
}

/**
 * Plain-text templates. Calm, British spelling, no urgency, no upsell.
 * Crisis/support boundaries live in the product and policy pages, not in
 * transactional mail.
 */
function render(template: TemplateName, d: Record<string, string>): RenderedEmail {
  switch (template) {
    case 'account_claim':
      return {
        subject: `Your Sangham library access: ${d.productTitle}`,
        text: [
          `Thank you. Your payment for ${d.productTitle} is confirmed (order ${d.orderRef}).`,
          ``,
          `Your purchase lives in your Sangham library. To open it, sign in with this email address — no password needed:`,
          ``,
          `${d.claimUrl}`,
          ``,
          `We'll email you a sign-in link. Your purchase is already attached to this address, so it will be waiting when you arrive.`,
          ``,
          `If anything doesn't work, reply to this email and we'll sort it out.`,
          ``,
          `Sangham`,
          `www.sangham.org`,
        ].join('\n'),
      };
    case 'access_ready':
      return {
        subject: `${d.productTitle} is in your library`,
        text: [
          `Thank you. Your payment for ${d.productTitle} is confirmed (order ${d.orderRef}).`,
          ``,
          `It's ready in your library:`,
          ``,
          `${d.libraryUrl}`,
          ``,
          `If anything doesn't work, reply to this email and we'll sort it out.`,
          ``,
          `Sangham`,
          `www.sangham.org`,
        ].join('\n'),
      };
    case 'payment_confirmation':
      return {
        subject: `Payment received: ${d.productTitle}`,
        text: [
          `We've received your payment for ${d.productTitle} (order ${d.orderRef}, ${d.amount}).`,
          ``,
          `Access details follow in a separate email.`,
          ``,
          `Sangham`,
        ].join('\n'),
      };
    case 'refund_processed':
      return {
        subject: `Refund processed: order ${d.orderRef}`,
        text: [
          `Your refund for order ${d.orderRef} (${d.productTitle}) has been processed.`,
          `${d.note ?? ''}`,
          ``,
          `If you have any questions, reply to this email.`,
          ``,
          `Sangham`,
        ].join('\n'),
      };
    case 'access_changed':
      return {
        subject: `Your access to ${d.productTitle} has changed`,
        text: [
          `Your access to ${d.productTitle} is now: ${d.newState}.`,
          `${d.note ?? ''}`,
          ``,
          `If this seems wrong, reply to this email and we'll look into it.`,
          ``,
          `Sangham`,
        ].join('\n'),
      };
  }
}

/**
 * Send (or log) a transactional email. Never throws into the payment path:
 * fulfilment must not fail because mail failed — failures are recorded for
 * the admin fulfilment-failure view instead.
 */
export async function sendTransactionalEmail(
  admin: SupabaseClient,
  input: SendInput,
): Promise<{ delivered: boolean; provider: string }> {
  const provider = (import.meta.env.EMAIL_PROVIDER as string | undefined) ?? 'log';
  const rendered = render(input.template, input.data);

  // Consent record (transactional purpose: contract necessity).
  try {
    await admin.from('email_consents').upsert(
      {
        email: input.to.toLowerCase(),
        purpose: 'transactional',
        status: 'granted',
        source: `transactional:${input.template}`,
        consent_text_version: 'purchase-fulfilment-v1',
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: 'email,purpose', ignoreDuplicates: true },
    );
  } catch {
    /* consent record failure never blocks fulfilment */
  }

  try {
    if (provider === 'resend') {
      const apiKey = import.meta.env.EMAIL_API_KEY as string | undefined;
      const from = (import.meta.env.EMAIL_FROM as string | undefined) ?? 'Sangham <library@sangham.org>';
      if (!apiKey) throw new Error('EMAIL_API_KEY missing');
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: rendered.subject,
          text: rendered.text,
        }),
      });
      if (!response.ok) throw new Error(`resend send failed: ${response.status}`);
      return { delivered: true, provider };
    }

    // 'log' provider: no delivery. Log without exposing full recipient.
    const masked = input.to.replace(/^(.).*(@.*)$/, '$1***$2');
    console.log(`[email:log] template=${input.template} to=${masked} subject="${rendered.subject}"`);
    return { delivered: false, provider: 'log' };
  } catch (error) {
    console.error(`[email:error] template=${input.template}: ${(error as Error).message}`);
    return { delivered: false, provider };
  }
}
