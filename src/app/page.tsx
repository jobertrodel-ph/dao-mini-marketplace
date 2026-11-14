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
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id, title, description, price, seller_email, category, image_url, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      initialError = error.message;
    } else if (data) {
      initialListings = data as Listing[];
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
