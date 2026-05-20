import { getSupabase } from "./supabase";

export type PricingCategory = "green_fee" | "cart" | "range" | "lesson" | "other";

export const PRICING_CATEGORIES: ReadonlyArray<PricingCategory> = [
  "green_fee",
  "cart",
  "range",
  "lesson",
  "other",
];

export const COURSE_OPTIONS: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: "forest-hills", label: "Forest Hills" },
  { slug: "vadrosza", label: "Vadrósza" },
];

export type PricingItem = {
  id: string;
  category: PricingCategory;
  label: string;
  course_slug: string | null;
  amount: number;
  currency: string;
  notes: string | null;
  active: boolean;
  sort_order: number;
  updated_at?: string;
};

export type PricingItemInput = {
  category: PricingCategory;
  label: string;
  course_slug: string | null;
  amount: number;
  currency: string;
  notes: string | null;
  active: boolean;
  sort_order: number;
};

export async function listPricing(): Promise<PricingItem[]> {
  const { data, error } = await getSupabase()
    .from("pricing_items")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("category", { ascending: true })
    .order("label", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PricingItem[];
}

export async function createPricing(input: PricingItemInput): Promise<PricingItem> {
  const { data, error } = await getSupabase()
    .from("pricing_items")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as PricingItem;
}

export async function updatePricing(id: string, input: PricingItemInput): Promise<PricingItem> {
  const { data, error } = await getSupabase()
    .from("pricing_items")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as PricingItem;
}

/** Soft-delete: marks deleted_at; the audit trigger fills deleted_by. */
export async function deletePricing(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("pricing_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
