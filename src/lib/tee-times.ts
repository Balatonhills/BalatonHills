import { getSupabase } from "./supabase";
import { COURSE_OPTIONS } from "./pricing";

export type TeeTimeStatus =
  | "booked"
  | "confirmed"
  | "completed"
  | "no-show"
  | "cancelled"
  | "blocked";

export const TEE_TIME_STATUSES: ReadonlyArray<TeeTimeStatus> = [
  "booked",
  "confirmed",
  "completed",
  "no-show",
  "cancelled",
  "blocked",
];

export const TEE_TIME_COURSES = COURSE_OPTIONS;

export type TeeTime = {
  id: string;
  starts_at: string;
  course_slug: string;
  party_size: number;
  primary_member_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  status: TeeTimeStatus;
  block_reason: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TeeTimeInput = {
  starts_at: string;
  course_slug: string;
  party_size: number;
  primary_member_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  status: TeeTimeStatus;
  block_reason: string | null;
  notes: string | null;
};

export type ListTeeTimesFilter = {
  from?: string;
  to?: string;
  course_slug?: string | "";
  status?: TeeTimeStatus | "";
  includeCancelled?: boolean;
};

export async function listTeeTimes(filter: ListTeeTimesFilter = {}): Promise<TeeTime[]> {
  let q = getSupabase().from("tee_times").select("*").order("starts_at", { ascending: true });
  if (filter.from) q = q.gte("starts_at", filter.from);
  if (filter.to) q = q.lte("starts_at", filter.to);
  if (filter.course_slug) q = q.eq("course_slug", filter.course_slug);
  if (filter.status) q = q.eq("status", filter.status);
  else if (!filter.includeCancelled) q = q.neq("status", "cancelled");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TeeTime[];
}

export async function getTeeTime(id: string): Promise<TeeTime | null> {
  const { data, error } = await getSupabase().from("tee_times").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as TeeTime;
}

export async function createTeeTime(input: TeeTimeInput): Promise<TeeTime> {
  const { data, error } = await getSupabase().from("tee_times").insert(input).select("*").single();
  if (error) throw error;
  return data as TeeTime;
}

export async function updateTeeTime(id: string, input: TeeTimeInput): Promise<TeeTime> {
  const { data, error } = await getSupabase()
    .from("tee_times")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as TeeTime;
}

export async function deleteTeeTime(id: string): Promise<void> {
  const { error } = await getSupabase().from("tee_times").delete().eq("id", id);
  if (error) throw error;
}

export async function countTeeTimesBetween(fromISO: string, toISO: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("tee_times")
    .select("id", { count: "exact", head: true })
    .gte("starts_at", fromISO)
    .lte("starts_at", toISO)
    .neq("status", "cancelled");
  if (error) return 0;
  return count ?? 0;
}
