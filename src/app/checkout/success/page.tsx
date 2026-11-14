import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import OrderStatusRefresher from "@/components/OrderStatusRefresher";
import { getStripeClient } from "@/lib/stripe";
import {
  formatUsdFromCents,
  getSupabaseAdminClient,
  type Listing,
  type OrderRecord,
} from "@/lib/supabase";

interface SuccessSearchParams {
  session_id?: string;
  listing_id?: string;
}

async function SuccessLoader({
  searchParams,
}: {
  searchParams: Promise<SuccessSearchParams>;
}) {
  await connection();
  const resolved = await searchParams;
  const sessionId = resolved.session_id?.trim() ?? "";
  const listingId = resolved.listing_id?.trim() ?? "";

  if (!sessionId || !listingId) {
    return (
      <main className="bazaar-container bazaar-container--narrow">
        <div className="empty-bazaar">
          <h1 className="empty-title">Missing Order Reference</h1>
          <p className="empty-copy">
            No Stripe Checkout session was provided in this URL.
          </p>
          <Link href="/" className="btn-offer-treasure">
            Return to Immortal Bazaar
          </Link>
        </div>
      </main>
    );
  }

  let listing: Listing | null = null;
  let order: OrderRecord | null = null;
  let stripePaidAmountCents = 0;
  let stripeFeeCents = 0;
  let paymentStatus = "unpaid";
  let loadError: string | null = null;

  try {
    const supabase = getSupabaseAdminClient();
    const { data: listingData, error: listingErr } = await supabase
      .from("listings")
      .select(
        "id, title, description, price, seller_email, category, image_url, status, created_at",
      )
      .eq("id", listingId)
      .maybeSingle();

    if (listingErr) {
      loadError = listingErr.message;
    } else if (listingData) {
      listing = listingData as Listing;

      const { data: sellerData } = await supabase
        .from("sellers")
        .select("stripe_account_id")
        .eq("email", listing.seller_email.trim().toLowerCase())
        .maybeSingle();

      if (sellerData?.stripe_account_id) {
        const stripe = getStripeClient();
        const session = await stripe.checkout.sessions.retrieve(
          sessionId,
          {},
          {
            stripeAccount: sellerData.stripe_account_id,
          },
        );
        paymentStatus = session.payment_status;
        stripePaidAmountCents =
          session.amount_total ?? Math.round(Number(listing.price) * 100);
        const metaFee = Number(session.metadata?.application_fee_cents);
        stripeFeeCents = Number.isFinite(metaFee)
          ? metaFee
          : Math.round(stripePaidAmountCents * 0.1);
      }

      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (orderData) {
        order = orderData as OrderRecord;
      }
    }
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Unable to verify order details.";
  }

  if (loadError || !listing) {
    return (
      <main className="bazaar-container bazaar-container--narrow">
        <p className="bazaar-error" role="alert">
          {loadError ?? "Listing not found."}
        </p>
        <Link href="/" className="back-link">
          ← Return to Immortal Bazaar
        </Link>
      </main>
    );
  }

  const isWebhookConfirmed = Boolean(order) && listing.status === "sold";
  const totalCents = order?.amount_total_cents ?? stripePaidAmountCents;
  const feeCents = order?.application_fee_cents ?? stripeFeeCents;
  const sellerPayoutCents = Math.max(0, totalCents - feeCents);

  return (
    <main className="bazaar-container bazaar-container--narrow">
      <OrderStatusRefresher isConfirmed={isWebhookConfirmed} />

      <section className="success-receipt-card">
        <span className="success-seal" aria-hidden="true">
          契
        </span>
        <span className="hero-eyebrow">SPIRIT PACT FULFILLED</span>
        <h1 className="form-title">Order Confirmed!</h1>
        <p className="form-subtitle">
          Your payment for <strong>{listing.title}</strong> succeeded in Stripe
          Sandbox.
        </p>

        <div
          className={isWebhookConfirmed ? "message-success" : "bazaar-notice"}
          role="status"
        >
          {isWebhookConfirmed
            ? "Webhook verified: Order recorded in Supabase and listing marked as SOLD."
            : paymentStatus === "paid"
              ? "Payment received! Waiting a moment for Stripe webhook confirmation..."
              : "Checking payment confirmation status..."}
        </div>

        <dl className="receipt-grid">
          <div className="receipt-row">
            <dt>Treasure</dt>
            <dd>{listing.title}</dd>
          </div>
          <div className="receipt-row">
            <dt>Total Paid</dt>
            <dd>{formatUsdFromCents(totalCents)}</dd>
          </div>
          <div className="receipt-row">
            <dt>Seller Payout (90%)</dt>
            <dd>{formatUsdFromCents(sellerPayoutCents)}</dd>
          </div>
          <div className="receipt-row">
            <dt>Bazaar Fee (10%)</dt>
            <dd>{formatUsdFromCents(feeCents)}</dd>
          </div>
          <div className="receipt-row">
            <dt>Listing Status</dt>
            <dd className="receipt-status-value">
              {listing.status === "sold" ? "SOLD" : "Processing"}
            </dd>
          </div>
        </dl>

        <div className="connect-next-actions">
          <Link href="/" className="btn-offer-treasure">
            Return to Immortal Bazaar
          </Link>
          <Link href={`/listings/${listing.id}`} className="nav-link">
            View Sold Listing →
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SuccessSearchParams>;
}) {
  return (
    <Suspense
      fallback={<div className="bazaar-loading">Sealing Spirit Pact...</div>}
    >
      <SuccessLoader searchParams={searchParams} />
    </Suspense>
  );
}
