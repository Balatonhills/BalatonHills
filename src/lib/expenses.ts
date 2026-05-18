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
  let q = getSupabase().from("expenses").select("*").order("date", { ascending: false });
  if (filter.from) q = q.gte("date", filter.from);
  if (filter.to) q = q.lte("date", filter.to);
  if (filter.category) q = q.eq("category", filter.category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Expense[];
}

export async function getExpense(id: string): Promise<Expense | null> {
  const { data, error } = await getSupabase().from("expenses").select("*").eq("id", id).single();
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

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await getSupabase().from("expenses").delete().eq("id", id);
  if (error) throw error;
}

export async function sumExpensesBetween(fromDate: string, toDate: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .select("amount")
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
    .gte("date", fromDate)
    .lte("date", toDate);
  if (error) return {};
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    out[row.category] = (out[row.category] ?? 0) + Number(row.amount);
  }
  return out;
}

export function firstDayOfMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function lastDayOfMonth(d: Date = new Date()): string {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}
