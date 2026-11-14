import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const TREASURE_CATEGORIES = [
  'Spirit Weapons',
  'Elixirs & Pills',
  'Dao Manuals',
  'Formation Talismans',
  'Spirit Relics',
] as const;

export type TreasureCategory = (typeof TREASURE_CATEGORIES)[number];

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  seller_email: string;
  category: TreasureCategory;
  image_url: string;
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