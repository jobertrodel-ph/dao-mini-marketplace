import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import ListedDate from "@/components/ListedDate";
import MessageSellerForm from "@/components/MessageSellerForm";
import {
  formatSpiritStones,
  getSupabaseClient,
  type Listing,
} from "@/lib/supabase";

async function ListingDetailLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;

  let listing: Listing | null = null;
  let loadError: string | null = null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id, title, description, price, seller_email, category, image_url, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      loadError = error.message;
    } else if (data) {
      listing = data as Listing;
    }
  } catch (err) {
    loadError =
      err instanceof Error
        ? err.message
        : "Unable to load listing details from Supabase.";
  }

  if (loadError) {
    return (
      <main className="bazaar-container">
        <Link href="/" className="back-link">
          ← Back to Immortal Bazaar
        </Link>
        <p className="bazaar-error" role="alert">
          {loadError}
        </p>
      </main>
    );
  }

  if (!listing) {
    notFound();
  }

  return (
    <main className="bazaar-container">
      <Link href="/" className="back-link">
        ← Back to Immortal Bazaar
      </Link>

      <div className="detail-layout">
        <div className="detail-visual-card">
          <div className="detail-image-frame">
            <Image
              src={listing.image_url}
              alt={listing.title}
              fill
              sizes="(max-width: 820px) 100vw, 52vw"
              className="detail-image"
              priority
            />
          </div>
        </div>

        <div className="detail-info-column">
          <section className="detail-scroll-card">
            <span className="treasure-category-pill detail-pill">
              {listing.category}
            </span>
            <h1 className="detail-title">{listing.title}</h1>
            <p className="detail-price">{formatSpiritStones(listing.price)}</p>

            <div className="detail-meta-grid">
              <div className="meta-item">
                <span className="meta-label">Seller Contact</span>
                <span className="meta-value">{listing.seller_email}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Inscribed On</span>
                <span className="meta-value">
                  <ListedDate isoDate={listing.created_at} />
                </span>
              </div>
            </div>

            <div className="detail-description-box">
              <h2 className="detail-section-heading">Relic Appraisal</h2>
              <p className="detail-description">{listing.description}</p>
            </div>
          </section>

          <MessageSellerForm listingId={listing.id} />
        </div>
      </div>
    </main>
  );
}

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="bazaar-loading">Appraising Spirit Relic...</div>
      }
    >
      <ListingDetailLoader params={params} />
    </Suspense>
  );
}
