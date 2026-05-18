import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  createExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  getExpense,
  updateExpense,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
} from "@/lib/expenses";

export const Route = createFileRoute("/admin/expenses/$id")({
  head: () => ({
    meta: [{ title: "Expense — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ExpenseEditPage,
});

type FormState = {
  date: string;
  category: ExpenseCategory;
  vendor: string;
  amount: string;
  currency: string;
  notes: string;
  receipt_url: string;
};

const EMPTY_FORM: FormState = {
  date: new Date().toISOString().slice(0, 10),
  category: "other",
  vendor: "",
  amount: "",
  currency: "HUF",
  notes: "",
  receipt_url: "",
};

function expenseToForm(e: Expense): FormState {
  return {
    date: e.date,
    category: e.category,
    vendor: e.vendor ?? "",
    amount: String(e.amount),
    currency: e.currency,
    notes: e.notes ?? "",
    receipt_url: e.receipt_url ?? "",
  };
}

function formToInput(f: FormState): ExpenseInput | null {
  const amount = Number.parseFloat(f.amount);
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (!f.date) return null;
  return {
    date: f.date,
    category: f.category,
    vendor: f.vendor.trim() || null,
    amount,
    currency: f.currency.trim().toUpperCase() || "HUF",
    notes: f.notes.trim() || null,
    receipt_url: f.receipt_url.trim() || null,
  };
}

function ExpenseEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isNew) {
      setForm(EMPTY_FORM);
      setLoading(false);
      setNotFound(false);
      return;
    }
    setLoading(true);
    getExpense(id)
      .then((e) => {
        if (!e) setNotFound(true);
        else setForm(expenseToForm(e));
      })
      .catch((e) => setStatus({ kind: "err", msg: e instanceof Error ? e.message : "Failed" }))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const input = formToInput(form);
    if (!input) {
      setStatus({ kind: "err", msg: "Date and a non-negative amount are required." });
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = await createExpense(input);
        navigate({ to: "/admin/expenses/$id", params: { id: created.id }, replace: true });
      } else {
        await updateExpense(id, input);
        setStatus({ kind: "ok", msg: "Saved" });
      }
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (isNew) return;
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    setSaving(true);
    setStatus(null);
    try {
      await deleteExpense(id);
      navigate({ to: "/admin/expenses" });
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Delete failed" });
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-muted-foreground">Expense not found.</p>
        <Link
          to="/admin/expenses"
          className="mt-4 inline-block text-xs uppercase tracking-[0.2em] text-foreground underline"
        >
          ← Back to expenses
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/admin/expenses"
        className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        ← Back to expenses
      </Link>
      <header className="mt-4 border-b border-input pb-6">
        <h1 className="font-display text-3xl text-foreground">
          {isNew ? "New expense" : "Edit expense"}
        </h1>
      </header>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={onSave} className="mt-8 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Category
              </span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Field
            label="Vendor"
            value={form.vendor}
            onChange={(v) => setForm({ ...form, vendor: v })}
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(v) => setForm({ ...form, amount: v })}
            />
            <Field
              label="Currency"
              value={form.currency}
              onChange={(v) => setForm({ ...form, currency: v })}
            />
          </div>

          <Field
            label="Receipt URL"
            type="url"
            value={form.receipt_url}
            onChange={(v) => setForm({ ...form, receipt_url: v })}
          />

          <Field
            label="Notes"
            value={form.notes}
            onChange={(v) => setForm({ ...form, notes: v })}
            multiline
            rows={3}
          />

          <div className="flex items-center gap-4 border-t border-input pt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : isNew ? "Create expense" : "Save"}
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={onDelete}
                disabled={saving}
                className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            )}
            {status && (
              <p
                className={status.kind === "ok" ? "text-sm text-green-700" : "text-sm text-red-700"}
                role="status"
              >
                {status.msg}
              </p>
            )}
          </div>
        </form>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  step,
  multiline,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows ?? 3}
          className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <input
          type={type ?? "text"}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
    </label>
  );
}
