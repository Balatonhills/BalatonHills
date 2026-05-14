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

export const SLOT_INTERVAL_MIN = 10;
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 19;

/**
 * Generate every tee-time slot for a single local date as ISO strings.
 * Slots run from DAY_START_HOUR (inclusive) to DAY_END_HOUR (exclusive)
 * in SLOT_INTERVAL_MIN steps, interpreted in the browser's local timezone.
 */
export function generateSlotsForDate(dateStr: string): string[] {
  const [yStr, mStr, dStr] = dateStr.split("-");
  const year = Number(yStr);
  const month = Number(mStr) - 1;
  const day = Number(dStr);
  const out: string[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    for (let min = 0; min < 60; min += SLOT_INTERVAL_MIN) {
      out.push(new Date(year, month, day, h, min, 0, 0).toISOString());
    }
  }
  return out;
}

/** Round an ISO timestamp to the nearest SLOT_INTERVAL_MIN boundary. */
export function snapToSlot(iso: string): string {
  const d = new Date(iso);
  const ms = SLOT_INTERVAL_MIN * 60_000;
  return new Date(Math.round(d.getTime() / ms) * ms).toISOString();
}

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
