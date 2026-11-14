import { NextResponse } from 'next/server';
import { getAppOrigin, getStripeClient } from '@/lib/stripe';
import { getSupabaseAdminClient } from '@/lib/supabase';

interface CheckoutPayload {
  listingId?: unknown;
}

const PLATFORM_FEE_RATE = 0.1;

export async function POST(request: Request) {
  let payload: CheckoutPayload;

  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const listingId =
    typeof payload.listingId === 'string' ? payload.listingId.trim() : '';

  if (!listingId) {
    return NextResponse.json(
      { error: 'Missing listing ID.' },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripeClient();
    const supabase = getSupabaseAdminClient();
    const origin = getAppOrigin(request);

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(
        'id, title, category, price, seller_email, image_url, status'
      )
      .eq('id', listingId)
      .maybeSingle();

    if (listingError) {
      return NextResponse.json(
        { error: listingError.message },
        { status: 500 }
      );
    }

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found.' },
        { status: 404 }
      );
    }

    if (listing.status === 'sold') {
      return NextResponse.json(
        { error: 'This treasure has already been sold.' },
        { status: 409 }
      );
    }

    const sellerEmail = String(listing.seller_email).trim().toLowerCase();
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('email, stripe_account_id, charges_enabled')
      .eq('email', sellerEmail)
      .maybeSingle();

    if (sellerError) {
      return NextResponse.json(
        { error: sellerError.message },
        { status: 500 }
      );
    }

    if (!seller || !seller.charges_enabled) {
      return NextResponse.json(
        { error: 'This seller has not completed Stripe onboarding yet.' },
        { status: 400 }
      );
    }

    const unitAmountCents = Math.round(Number(listing.price) * 100);
    if (Number.isNaN(unitAmountCents) || unitAmountCents < 50) {
      return NextResponse.json(
        {
          error:
            'Listing price must be at least 0.50 ($0.50 USD) for Stripe Checkout.',
        },
        { status: 400 }
      );
    }

    const applicationFeeCents = Math.round(unitAmountCents * PLATFORM_FEE_RATE);

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: listing.title,
                description: `${listing.category} • Immortal Bazaar`,
                images: listing.image_url ? [listing.image_url] : undefined,
              },
              unit_amount: unitAmountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFeeCents,
        },
        metadata: {
          listing_id: listing.id,
          seller_email: sellerEmail,
          connected_account_id: seller.stripe_account_id,
          application_fee_cents: String(applicationFeeCents),
        },
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&listing_id=${encodeURIComponent(
          listing.id
        )}`,
        cancel_url: `${origin}/listings/${encodeURIComponent(
          listing.id
        )}?canceled=1`,
      },
      {
        stripeAccount: seller.stripe_account_id,
      }
    );

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe Checkout session URL was not returned.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unable to create Stripe Checkout session.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}