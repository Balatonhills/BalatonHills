import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useIsAdmin } from "@/lib/admin-auth";
import {
  COURSE_OPTIONS,
  createPricing,
  deletePricing,
  listPricing,
  PRICING_CATEGORIES,
  type PricingCategory,
  type PricingItem,
  type PricingItemInput,
  updatePricing,
} from "@/lib/pricing";

export const Route = createFileRoute("/admin/pricing")({
  head: () => ({
    meta: [{ title: "Pricing — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PricingPage,
});

type FormState = {
  category: PricingCategory;
  label: string;
  course_slug: string;
  amount: string;
  currency: string;
  notes: string;
  active: boolean;
  sort_order: string;
};

const EMPTY_FORM: FormState = {
  category: "green_fee",
  label: "",
  course_slug: "",
  amount: "",
  currency: "HUF",
  notes: "",
  active: true,
  sort_order: "0",
};

function itemToForm(p: PricingItem): FormState {
  return {
    category: p.category,
    label: p.label,
    course_slug: p.course_slug ?? "",
    amount: String(p.amount),
    currency: p.currency,
    notes: p.notes ?? "",
    active: p.active,
    sort_order: String(p.sort_order),
  };
}

function formToInput(f: FormState): PricingItemInput | null {
  const amount = Number.parseFloat(f.amount);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const sortOrder = Number.parseInt(f.sort_order, 10);
  return {
    category: f.category,
    label: f.label.trim(),
    course_slug: f.course_slug || null,
    amount,
    currency: f.currency.trim().toUpperCase() || "HUF",
    notes: f.notes.trim() || null,
    active: f.active,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

function PricingPage() {
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setItems(await listPricing());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pricing");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function startEdit(item: PricingItem) {
    setEditingId(item.id);
    setForm(itemToForm(item));
    setStatus(null);
  }

  function startNew() {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setStatus(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setStatus(null);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!form.label.trim()) {
      setStatus({ kind: "err", msg: "Label is required." });
      return;
    }
    const input = formToInput(form);
    if (!input) {
      setStatus({ kind: "err", msg: "Amount must be a non-negative number." });
      return;
    }
    setSaving(true);
    try {
      if (editingId === "new") {
        await createPricing(input);
      } else if (editingId) {
        await updatePricing(editingId, input);
      }
      setEditingId(null);
      await refresh();
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: PricingItem) {
    if (!window.confirm(`Delete "${item.label}"?`)) return;
    try {
      await deletePricing(item.id);
      if (editingId === item.id) setEditingId(null);
      await refresh();
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Delete failed" });
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-input pb-6">
        <div>
          <h1 className="font-display text-3xl text-foreground">Pricing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin ? "Internal rate sheet" : "Rate sheet (read-only)"}.{" "}
            {loading ? "Loading…" : `${items.length} items.`}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={startNew}
            className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Add item
          </button>
        )}
      </header>

      {error && (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <section className="mt-8 overflow-x-auto border border-input">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <Th>Category</Th>
              <Th>Label</Th>
              <Th>Course</Th>
              <Th className="text-right">Amount</Th>
              <Th>Currency</Th>
              <Th>Active</Th>
              {isAdmin && <Th className="text-right">Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {isAdmin
                    ? 'No pricing items yet. Click "Add item" to create the first one.'
                    : "No pricing items yet."}
                </td>
              </tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-t border-input">
                <Td className="font-mono text-xs">{p.category}</Td>
                <Td className="font-medium text-foreground">{p.label}</Td>
                <Td>{courseLabel(p.course_slug)}</Td>
                <Td className="text-right tabular-nums">
                  {p.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Td>
                <Td>{p.currency}</Td>
                <Td>{p.active ? "Yes" : "No"}</Td>
                {isAdmin && (
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="mr-4 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p)}
                      className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-red-700"
                    >
                      Delete
                    </button>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editingId !== null && (
        <section className="mt-10 border border-input p-6">
          <h2 className="font-display text-xl text-foreground">
            {editingId === "new" ? "New pricing item" : "Edit pricing item"}
          </h2>

          <form onSubmit={onSave} className="mt-6 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Category
                </span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as PricingCategory })
                  }
                  className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {PRICING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Course
                </span>
                <select
                  value={form.course_slug}
                  onChange={(e) => setForm({ ...form, course_slug: e.target.value })}
                  className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All / general</option>
                  {COURSE_OPTIONS.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Field
              label="Label"
              value={form.label}
              onChange={(v) => setForm({ ...form, label: v })}
            />

            <div className="grid gap-6 sm:grid-cols-3">
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
              <Field
                label="Sort order"
                type="number"
                value={form.sort_order}
                onChange={(v) => setForm({ ...form, sort_order: v })}
              />
            </div>

            <Field
              label="Notes"
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
              multiline
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 border border-input"
              />
              <span className="text-sm text-foreground">Active</span>
            </label>

            <div className="flex items-center gap-4 border-t border-input pt-6">
              <button
                type="submit"
                disabled={saving}
                className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId === "new" ? "Create" : "Save"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              {status && (
                <p
                  className={
                    status.kind === "ok" ? "text-sm text-green-700" : "text-sm text-red-700"
                  }
                  role="status"
                >
                  {status.msg}
                </p>
              )}
            </div>
          </form>
        </section>
      )}
    </main>
  );
}

function courseLabel(slug: string | null): string {
  if (!slug) return "General";
  return COURSE_OPTIONS.find((c) => c.slug === slug)?.label ?? slug;
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={
        "px-4 py-3 text-left text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground " +
        (className ?? "")
      }
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-4 py-3 text-foreground " + (className ?? "")}>{children}</td>;
}

function Field({
  label,
  value,
  onChange,
  type,
  step,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
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
