import { Suspense } from "react";
import { connection } from "next/server";
import MarketplaceCatalog from "@/components/MarketplaceCatalog";
import { getSupabaseClient, type Listing } from "@/lib/supabase";

async function MarketplaceLoader() {
  await connection();

  let initialListings: Listing[] = [];
  let initialError: string | null = null;

  try {
    const supabase = getSupabaseClient();
    const [listingsRes, sellersRes] = await Promise.all([
      supabase
        .from("listings")
        .select(
          "id, title, description, price, seller_email, category, image_url, status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("sellers")
        .select("email, charges_enabled")
        .eq("charges_enabled", true),
    ]);

    if (listingsRes.error) {
      initialError = listingsRes.error.message;
    } else if (listingsRes.data) {
      const onboardedEmails = new Set(
        (sellersRes.data ?? []).map((row) =>
          String(row.email).trim().toLowerCase(),
        ),
      );
      initialListings = (listingsRes.data as Listing[]).map((item) => ({
        ...item,
        status: item.status ?? "available",
        seller_onboarded: onboardedEmails.has(
          item.seller_email.trim().toLowerCase(),
        ),
      }));
    }
  } catch (err) {
    initialError =
      err instanceof Error
        ? err.message
        : "Unable to load listings from Supabase.";
  }

  return (
    <MarketplaceCatalog
      initialListings={initialListings}
      initialError={initialError}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="bazaar-loading">Opening the Immortal Bazaar...</div>
      }
    >
      <MarketplaceLoader />
    </Suspense>
  );
}
