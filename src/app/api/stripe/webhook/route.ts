import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Missing STRIPE_WEBHOOK_SECRET.' },
      { status: 500 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header.' },
      { status: 400 }
    );
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Invalid webhook signature.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;

    const { data: existingSeller } = await supabase
      .from('sellers')
      .select('email')
      .eq('stripe_account_id', account.id)
      .maybeSingle();

    if (!existingSeller) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const { error: updateSellerError } = await supabase
      .from('sellers')
      .update({
        charges_enabled: Boolean(account.charges_enabled),
        details_submitted: Boolean(account.details_submitted),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', account.id);

    if (updateSellerError) {
      return NextResponse.json(
        { error: updateSellerError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const listingId = session.metadata?.listing_id;

    if (!listingId) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const { data: listing } = await supabase
      .from('listings')
      .select('id, price')
      .eq('id', listingId)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json({ received: true, ignored: true });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true, ignored: true });
    }

    const amountTotalCents =
      session.amount_total ?? Math.round(Number(listing.price) * 100);
    const feeFromMeta = Number(session.metadata?.application_fee_cents);
    const applicationFeeCents = Number.isFinite(feeFromMeta)
      ? feeFromMeta
      : Math.round(amountTotalCents * 0.1);
    const connectedAccountId =
      event.account ?? session.metadata?.connected_account_id ?? 'unknown';
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const { error: orderError } = await supabase.from('orders').upsert(
      {
        listing_id: listing.id,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        connected_account_id: connectedAccountId,
        buyer_email: session.customer_details?.email ?? null,
        amount_total_cents: amountTotalCents,
        application_fee_cents: applicationFeeCents,
        currency: session.currency ?? 'usd',
        status: 'paid',
      },
      { onConflict: 'stripe_session_id' }
    );

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const { error: soldError } = await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listing.id);

    if (soldError) {
      return NextResponse.json({ error: soldError.message }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}