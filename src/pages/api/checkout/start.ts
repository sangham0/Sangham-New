/**
 * POST /api/checkout/start
 * Body: { productSlug: string, provider: 'payfast' | 'paypal', email?: string }
 *
 * Creates a pending Sangham order (price fixed SERVER-SIDE from the products
 * table — client-supplied amounts are ignored) and returns the provider
 * redirect. Signed-in buyers use their account email; guests supply one.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createAdminClient } from '../../../lib/supabase';
import { getSession, sameOriginOk } from '../../../lib/access';
import { payfastCheckoutRedirect, payfastConfig } from '../../../lib/payments/payfast';
import { paypalCheckoutRedirect, paypalConfig } from '../../../lib/payments/paypal';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async (ctx) => {
  if (!sameOriginOk(ctx)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  let body: { productSlug?: string; provider?: string; email?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const provider = body.provider === 'paypal' ? 'paypal' : body.provider === 'payfast' ? 'payfast' : null;
  const productSlug = typeof body.productSlug === 'string' ? body.productSlug.slice(0, 80) : '';
  if (!provider || !productSlug) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400 });
  }

  if (provider === 'payfast' && !payfastConfig()) {
    return new Response(JSON.stringify({ error: 'payfast_unavailable' }), { status: 503 });
  }
  if (provider === 'paypal' && !paypalConfig()) {
    return new Response(JSON.stringify({ error: 'paypal_unavailable' }), { status: 503 });
  }

  // Buyer email: account email when signed in, else validated input.
  const session = await getSession(ctx);
  const email = (session.user?.email ?? body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400 });
  }

  const admin = createAdminClient();
  const { data: product } = await admin
    .from('products')
    .select('id, slug, title, status, is_public_access, price_cents, currency, price_usd_cents')
    .eq('slug', productSlug)
    .single();

  if (!product || product.status !== 'published' || product.is_public_access) {
    return new Response(JSON.stringify({ error: 'product_unavailable' }), { status: 404 });
  }

  // Server-side price selection per provider currency reality:
  // PayFast settles ZAR; SA PayPal accounts charge USD.
  let amountCents: number;
  let currency: string;
  if (provider === 'payfast') {
    if (!product.price_cents || product.currency !== 'ZAR') {
      return new Response(JSON.stringify({ error: 'no_zar_price' }), { status: 409 });
    }
    amountCents = product.price_cents;
    currency = 'ZAR';
  } else {
    if (!product.price_usd_cents) {
      return new Response(JSON.stringify({ error: 'no_usd_price' }), { status: 409 });
    }
    amountCents = product.price_usd_cents;
    currency = 'USD';
  }

  const testMode =
    provider === 'payfast'
      ? (import.meta.env.PAYFAST_MODE as string | undefined) !== 'live'
      : (import.meta.env.PAYPAL_MODE as string | undefined) !== 'live';

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      user_id: session.user?.id ?? null,
      email,
      product_id: product.id,
      amount_cents: amountCents,
      currency,
      status: 'pending',
      provider,
      test_mode: testMode,
    })
    .select('id, order_ref, email, product_id, amount_cents, currency, test_mode')
    .single();

  if (orderError || !order) {
    return new Response(JSON.stringify({ error: 'order_creation_failed' }), { status: 500 });
  }

  const siteOrigin = new URL(ctx.request.url).origin;

  try {
    if (provider === 'payfast') {
      const redirect = payfastCheckoutRedirect(
        { ...order, provider, test_mode: order.test_mode },
        product.title,
        siteOrigin,
      );
      return new Response(JSON.stringify({ orderRef: order.order_ref, redirect }), { status: 200 });
    }

    const { redirect, providerOrderId } = await paypalCheckoutRedirect(
      { ...order, provider, test_mode: order.test_mode },
      product.title,
      siteOrigin,
    );
    await admin.from('orders').update({ provider_order_ref: providerOrderId }).eq('id', order.id);
    return new Response(JSON.stringify({ orderRef: order.order_ref, redirect }), { status: 200 });
  } catch (error) {
    await admin.from('orders').update({ status: 'failed' }).eq('id', order.id);
    console.error(`[checkout] provider handoff failed: ${(error as Error).message}`);
    return new Response(JSON.stringify({ error: 'provider_handoff_failed' }), { status: 502 });
  }
};
