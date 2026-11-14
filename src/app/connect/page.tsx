import { Suspense } from "react";
import { connection } from "next/server";
import ConnectStripePanel from "@/components/ConnectStripePanel";
import { getStripeClient } from "@/lib/stripe";
import { getSupabaseAdminClient, type SellerAccount } from "@/lib/supabase";

interface ConnectSearchParams {
  email?: string;
  account_id?: string;
  connected?: string;
  refresh?: string;
}

async function ConnectLoader({
  searchParams,
}: {
  searchParams: Promise<ConnectSearchParams>;
}) {
  await connection();
  const resolved = await searchParams;

  const accountId = resolved.account_id?.trim() ?? "";
  let email = resolved.email?.trim().toLowerCase() ?? "";
  const wasReturned = resolved.connected === "1";
  const wasRefreshed = resolved.refresh === "1";

  let seller: SellerAccount | null = null;
  let loadError: string | null = null;

  try {
    const supabase = getSupabaseAdminClient();

    if (accountId) {
      const stripe = getStripeClient();
      const account = await stripe.accounts.retrieve(accountId);

      const { data: updatedSeller } = await supabase
        .from("sellers")
        .update({
          charges_enabled: Boolean(account.charges_enabled),
          details_submitted: Boolean(account.details_submitted),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", account.id)
        .select(
          "email, stripe_account_id, charges_enabled, details_submitted, created_at, updated_at",
        )
        .maybeSingle();

      if (updatedSeller) {
        seller = updatedSeller as SellerAccount;
        email = seller.email;
      }
    } else if (email) {
      const { data: existingSeller } = await supabase
        .from("sellers")
        .select(
          "email, stripe_account_id, charges_enabled, details_submitted, created_at, updated_at",
        )
        .eq("email", email)
        .maybeSingle();

      if (existingSeller) {
        seller = existingSeller as SellerAccount;
      }
    }
  } catch (err) {
    loadError =
      err instanceof Error
        ? err.message
        : "Unable to check Stripe Connect status.";
  }

  return (
    <ConnectStripePanel
      initialEmail={email}
      initialSeller={seller}
      wasRefreshed={wasRefreshed}
      wasReturned={wasReturned}
      initialError={loadError}
    />
  );
}

export default function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<ConnectSearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="bazaar-loading">Attuning Merchant Treasury...</div>
      }
    >
      <ConnectLoader searchParams={searchParams} />
    </Suspense>
  );
}
