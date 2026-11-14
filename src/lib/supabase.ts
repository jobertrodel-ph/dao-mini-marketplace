import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const TREASURE_CATEGORIES = [
  'Spirit Weapons',
  'Elixirs & Pills',
  'Dao Manuals',
  'Formation Talismans',
  'Spirit Relics',
] as const;

export type TreasureCategory = (typeof TREASURE_CATEGORIES)[number];

export type ListingStatus = 'available' | 'sold';

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  seller_email: string;
  category: TreasureCategory;
  image_url: string;
  status: ListingStatus;
  created_at: string;
  seller_onboarded?: boolean;
}

export interface SellerAccount {
  email: string;
  stripe_account_id: string;
  charges_enabled: boolean;
  details_submitted: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderRecord {
  id: string;
  listing_id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  connected_account_id: string;
  buyer_email: string | null;
  amount_total_cents: number;
  application_fee_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseKey);
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseKey);
  }

  return browserClient;
}

export function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase URL or API key environment variables.'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

export function formatSpiritStones(price: number): string {
  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice)) {
    return '0 Spirit Stones';
  }
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: numericPrice % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numericPrice);
  return `${formatted} Spirit Stones`;
}

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}