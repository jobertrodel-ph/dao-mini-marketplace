"use client";

import { useState, type FormEvent } from "react";

interface MessageSellerFormProps {
  listingId: string;
}

export default function MessageSellerForm({
  listingId,
}: MessageSellerFormProps) {
  const [buyerEmail, setBuyerEmail] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedEmail = buyerEmail.trim();
    const trimmedBody = body.trim();

    if (!trimmedEmail || !trimmedBody) {
      setErrorMsg("Please enter your email and a message for the seller.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
          buyerEmail: trimmedEmail,
          body: trimmedBody,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        emailSent?: boolean;
        emailNote?: string;
      };

      if (!response.ok) {
        setErrorMsg(
          result.error ?? "Unable to send your message to the seller.",
        );
        return;
      }

      setSuccessMsg(
        result.emailSent
          ? "Transmission sealed! Your message was saved and an email notification was sent to the seller."
          : `Transmission sealed! Your message was saved in Supabase.${
              result.emailNote ? ` (${result.emailNote})` : ""
            }`,
      );
      setBuyerEmail("");
      setBody("");
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Unable to reach the messaging service.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="message-seller-card" aria-label="Contact Seller">
      <h2 className="message-card-title">Send a Jade Transmission</h2>
      <p className="message-card-subtitle">
        Negotiate Spirit Stones or request a sect courtyard inspection.
      </p>

      {successMsg && (
        <div className="message-success" role="status">
          {successMsg}
        </div>
      )}

      <form className="listing-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="buyer-email" className="field-label">
            Your Email
          </label>
          <input
            id="buyer-email"
            type="email"
            className="text-input"
            placeholder="buyer@cloudpavilion.com"
            value={buyerEmail}
            onChange={(event) => setBuyerEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="field-group">
          <label htmlFor="buyer-message" className="field-label">
            Message
          </label>
          <textarea
            id="buyer-message"
            className="textarea-input"
            rows={3}
            maxLength={1000}
            placeholder="Greetings fellow Daoist, is this treasure still available?"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={isSubmitting}
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
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Message Seller"}
        </button>
      </form>
    </section>
  );
}
