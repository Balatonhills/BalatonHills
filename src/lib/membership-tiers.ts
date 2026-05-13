import { getSupabase } from "./supabase";

export type MembershipTier = {
  id: string;
  slug: string;
  name: string;
  price_display: string | null;
  perks: string[];
  sort_order: number;
  active: boolean;
  updated_at?: string;
};

let cache: { tiers: MembershipTier[]; expiresAt: number } | null = null;
const TTL_MS = 60_000;

export async function loadActiveTiers(): Promise<MembershipTier[]> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.tiers;

  try {
    const { data, error } = await getSupabase()
      .from("membership_tiers")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    const tiers = (data ?? []) as MembershipTier[];
    cache = { tiers, expiresAt: now + TTL_MS };
    return tiers;
  } catch {
    return cache?.tiers ?? [];
  }
}

export async function listAllTiers(): Promise<MembershipTier[]> {
  const { data, error } = await getSupabase()
    .from("membership_tiers")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MembershipTier[];
}

export function invalidateTiersCache() {
  cache = null;
}
