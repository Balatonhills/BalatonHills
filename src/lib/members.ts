import { getSupabase } from "./supabase";

export type MemberStatus = "active" | "suspended" | "expired" | "pending";

export const MEMBER_STATUSES: ReadonlyArray<MemberStatus> = [
  "active",
  "suspended",
  "expired",
  "pending",
];

export type Member = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  tier_id: string | null;
  status: MemberStatus;
  joined_at: string | null;
  renewal_due: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MemberInput = {
  full_name: string;
  email: string | null;
  phone: string | null;
  tier_id: string | null;
  status: MemberStatus;
  joined_at: string | null;
  renewal_due: string | null;
  notes: string | null;
};

export type ListMembersFilter = {
  q?: string;
  status?: MemberStatus | "";
  tier_id?: string | "";
};

export async function listMembers(filter: ListMembersFilter = {}): Promise<Member[]> {
  let q = getSupabase().from("members").select("*").order("full_name", { ascending: true });
  if (filter.q && filter.q.trim()) q = q.ilike("full_name", `%${filter.q.trim()}%`);
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.tier_id) q = q.eq("tier_id", filter.tier_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Member[];
}

export async function getMember(id: string): Promise<Member | null> {
  const { data, error } = await getSupabase().from("members").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Member;
}

export async function createMember(input: MemberInput): Promise<Member> {
  const { data, error } = await getSupabase().from("members").insert(input).select("*").single();
  if (error) throw error;
  return data as Member;
}

export async function updateMember(id: string, input: MemberInput): Promise<Member> {
  const { data, error } = await getSupabase()
    .from("members")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Member;
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await getSupabase().from("members").delete().eq("id", id);
  if (error) throw error;
}

export async function countMembersByStatus(status: MemberStatus): Promise<number> {
  const { count, error } = await getSupabase()
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  if (error) return 0;
  return count ?? 0;
}

export async function countRenewalsDueWithin(days: number): Promise<number> {
  const today = new Date();
  const future = new Date(today.getTime() + days * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const { count, error } = await getSupabase()
    .from("members")
    .select("id", { count: "exact", head: true })
    .gte("renewal_due", fmt(today))
    .lte("renewal_due", fmt(future))
    .eq("status", "active");
  if (error) return 0;
  return count ?? 0;
}
