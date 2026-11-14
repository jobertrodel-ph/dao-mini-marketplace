"use client";

import { useState } from "react";
import { formatUsdFromCents } from "@/lib/supabase";

interface BuyNowButtonProps {
  listingId: string;
  price: number;
}

export default function BuyNowButton({ listingId, price }: BuyNowButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalCents = Math.round(price * 100);
  const feeCents = Math.round(totalCents * 0.1);
  const sellerNetCents = totalCents - feeCents;

  async function handleBuyNow() {
    if (isRedirecting) {
      return;
    }

    setIsRedirecting(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId }),
      });

      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !result.url) {
        setErrorMsg(result.error ?? "Unable to open Stripe Checkout.");
        return;
      }

      window.location.href = result.url;
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Unable to start checkout right now.",
      );
    } finally {
      setIsRedirecting(false);
    }
  }

  return (
    <section className="buy-box-card" aria-label="Purchase Treasure">
      <div className="buy-box-header">
        <h2 className="buy-box-title">Claim This Treasure</h2>
        <span className="stripe-verified-tag">Stripe Verified Seller</span>
      </div>

      <dl className="fee-breakdown">
        <div className="fee-row">
          <dt>Checkout Total</dt>
          <dd>{formatUsdFromCents(totalCents)}</dd>
        </div>
        <div className="fee-row">
          <dt>Seller Payout (90%)</dt>
          <dd>{formatUsdFromCents(sellerNetCents)}</dd>
        </div>
        <div className="fee-row">
          <dt>Immortal Bazaar Fee (10%)</dt>
          <dd>{formatUsdFromCents(feeCents)}</dd>
        </div>
      </dl>

      {errorMsg && (
        <p className="bazaar-error" role="alert">
          {errorMsg}
        </p>
      )}

      <button
        type="button"
        className="btn-buy-now"
        onClick={handleBuyNow}
        disabled={isRedirecting}
      >
        {isRedirecting ? "Opening Stripe Checkout..." : "Buy Now"}
      </button>
    </section>
  );
}
