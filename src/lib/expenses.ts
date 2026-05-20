import { getSupabase } from "./supabase";

export type ExpenseCategory =
  | "payroll"
  | "grounds"
  | "facilities"
  | "supplies"
  | "marketing"
  | "insurance"
  | "other";

export const EXPENSE_CATEGORIES: ReadonlyArray<ExpenseCategory> = [
  "payroll",
  "grounds",
  "facilities",
  "supplies",
  "marketing",
  "insurance",
  "other",
];

export type Expense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  vendor: string | null;
  amount: number;
  currency: string;
  notes: string | null;
  receipt_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ExpenseInput = {
  date: string;
  category: ExpenseCategory;
  vendor: string | null;
  amount: number;
  currency: string;
  notes: string | null;
  receipt_url: string | null;
};

export type ListExpensesFilter = {
  from?: string;
  to?: string;
  category?: ExpenseCategory | "";
};

export async function listExpenses(filter: ListExpensesFilter = {}): Promise<Expense[]> {
  let q = getSupabase()
    .from("expenses")
    .select("*")
    .is("deleted_at", null)
    .order("date", { ascending: false });
  if (filter.from) q = q.gte("date", filter.from);
  if (filter.to) q = q.lte("date", filter.to);
  if (filter.category) q = q.eq("category", filter.category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Expense[];
}

export async function getExpense(id: string): Promise<Expense | null> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return { ...data, amount: Number(data.amount) } as Expense;
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const { data, error } = await getSupabase().from("expenses").insert(input).select("*").single();
  if (error) throw error;
  return { ...data, amount: Number(data.amount) } as Expense;
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return { ...data, amount: Number(data.amount) } as Expense;
}

/** Soft-delete: marks deleted_at; the audit trigger fills deleted_by.
 *  Receipt blob in storage is preserved so an undelete restores the row intact. */
export async function deleteExpense(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function sumExpensesBetween(fromDate: string, toDate: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .select("amount")
    .is("deleted_at", null)
    .gte("date", fromDate)
    .lte("date", toDate);
  if (error) return 0;
  return (data ?? []).reduce((acc, row) => acc + Number(row.amount), 0);
}

export async function expensesByCategoryBetween(
  fromDate: string,
  toDate: string,
): Promise<Record<string, number>> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .select("category, amount")
    .is("deleted_at", null)
    .gte("date", fromDate)
    .lte("date", toDate);
  if (error) return {};
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    out[row.category] = (out[row.category] ?? 0) + Number(row.amount);
  }
  return out;
}

// ---- Receipts (Supabase Storage) ------------------------------------------

const RECEIPTS_BUCKET = "receipts";
const SIGNED_URL_TTL_SEC = 60 * 60; // 1h

export const RECEIPT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function extensionFor(file: File): string {
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot > -1 && dot < name.length - 1) return name.slice(dot + 1);
  // Fallback by MIME
  const mime = file.type;
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

export async function uploadReceipt(file: File): Promise<string> {
  if (file.size > RECEIPT_MAX_BYTES) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${RECEIPT_MAX_BYTES / 1024 / 1024} MB.`,
    );
  }
  const ext = extensionFor(file);
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await getSupabase()
    .storage.from(RECEIPTS_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}

export async function deleteReceipt(path: string): Promise<void> {
  if (!path) return;
  const { error } = await getSupabase().storage.from(RECEIPTS_BUCKET).remove([path]);
  if (error) throw error;
}

export async function getReceiptSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await getSupabase()
    .storage.from(RECEIPTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export function isImageReceipt(path: string | null): boolean {
  if (!path) return false;
  const ext = path.toLowerCase().split(".").pop() ?? "";
  return ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext);
}

// ---- Date helpers ---------------------------------------------------------

export function firstDayOfMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function lastDayOfMonth(d: Date = new Date()): string {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}
