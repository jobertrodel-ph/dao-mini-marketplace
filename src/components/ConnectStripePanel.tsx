"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { SellerAccount } from "@/lib/supabase";

interface ConnectStripePanelProps {
  initialEmail: string;
  initialSeller: SellerAccount | null;
  wasRefreshed: boolean;
  wasReturned: boolean;
  initialError: string | null;
}

export default function ConnectStripePanel({
  initialEmail,
  initialSeller,
  wasRefreshed,
  wasReturned,
  initialError,
}: ConnectStripePanelProps) {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError);

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMsg("Please enter the email address used on your listings.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !result.url) {
        setErrorMsg(
          result.error ?? "Unable to generate Stripe onboarding link.",
        );
        return;
      }

      window.location.href = result.url;
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to connect to Stripe.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="bazaar-container bazaar-container--narrow">
      <Link href="/" className="back-link">
        ← Back to Immortal Bazaar
      </Link>

      <section className="form-scroll-card">
        <div className="form-header">
          <span className="hero-eyebrow">MERCHANT TREASURY ONBOARDING</span>
          <h1 className="form-title">Connect with Stripe</h1>
          <p className="form-subtitle">
            Link your seller email to a Stripe Connect sandbox account so buyers
            see the Buy Now button on all of your listings (90% seller payout,
            10% bazaar fee).
          </p>
        </div>

        {wasRefreshed && (
          <div className="bazaar-notice" role="status">
            Your previous Stripe onboarding link expired. Enter your email below
            to generate a fresh link.
          </div>
        )}

        {wasReturned && initialSeller && (
          <div
            className={
              initialSeller.charges_enabled
                ? "message-success"
                : "bazaar-notice"
            }
            role="status"
          >
            {initialSeller.charges_enabled
              ? `Stripe payouts active for ${initialSeller.email} (${initialSeller.stripe_account_id}). Every listing with this email now shows Buy Now!`
              : `Account ${initialSeller.stripe_account_id} was saved, but Stripe onboarding requirements are still pending. Click Connect with Stripe below to finish.`}
          </div>
        )}

        <form className="listing-form" onSubmit={handleConnect}>
          <div className="field-group">
            <label htmlFor="connect-email" className="field-label">
              Seller Email (must match your listing email)
            </label>
            <input
              id="connect-email"
              type="email"
              className="text-input"
              placeholder="elder@azuresect.org"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {errorMsg && (
            <p className="bazaar-error" role="alert">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary-gold"
            disabled={isLoading}
          >
            {isLoading ? "Redirecting to Stripe..." : "Connect with Stripe"}
          </button>
        </form>

        {initialSeller?.charges_enabled && (
          <div className="connect-next-actions">
            <Link href="/create" className="btn-offer-treasure">
              + Offer a Treasure
            </Link>
            <Link href="/" className="nav-link">
              View Listings in Bazaar →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
