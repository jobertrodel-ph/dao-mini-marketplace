"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseClient } from "@/lib/supabase";

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
  const [isSent, setIsSent] = useState(false);

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

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("messages").insert({
        listing_id: listingId,
        buyer_email: trimmedEmail,
        body: trimmedBody,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setIsSent(true);
      setBuyerEmail("");
      setBody("");
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Unable to send your message to Supabase.",
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

      {isSent && (
        <div className="message-success" role="status">
          Transmission sealed! Your message has been saved for the seller.
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
