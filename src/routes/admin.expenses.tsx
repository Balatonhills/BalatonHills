import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  EXPENSE_CATEGORIES,
  firstDayOfMonth,
  lastDayOfMonth,
  listExpenses,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expenses";

export const Route = createFileRoute("/admin/expenses")({
  head: () => ({
    meta: [{ title: "Expenses — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onIndex = pathname === "/admin/expenses" || pathname === "/admin/expenses/";
  if (!onIndex) return <Outlet />;
  return <ExpensesList />;
}

function ExpensesList() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(lastDayOfMonth());
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "">("");
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listExpenses({ from, to, category: categoryFilter })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [from, to, categoryFilter]);

  const summary = useMemo(() => {
    const byCategory = new Map<string, { total: number; currency: string }>();
    let total = 0;
    let currency = "HUF";
    for (const e of items) {
      total += e.amount;
      currency = e.currency;
      const prev = byCategory.get(e.category);
      if (prev) prev.total += e.amount;
      else byCategory.set(e.category, { total: e.amount, currency: e.currency });
    }
    return {
      total,
      currency,
      byCategory: Array.from(byCategory.entries()).sort((a, b) => b[1].total - a[1].total),
    };
  }, [items]);

  function setMonthRange(offsetMonths: number) {
    const d = new Date();
    d.setMonth(d.getMonth() + offsetMonths);
    setFrom(firstDayOfMonth(d));
    setTo(lastDayOfMonth(d));
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-input pb-6">
        <div>
          <h1 className="font-display text-3xl text-foreground">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
            {!loading && items.length > 0 && (
              <>
                {" · "}
                <span className="text-foreground">
                  {formatMoney(summary.total, summary.currency)}
                </span>{" "}
                total
              </>
            )}
          </p>
        </div>
        <Link
          to="/admin/expenses/$id"
          params={{ id: "new" }}
          className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Add expense
        </Link>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-4">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              const v = e.target.value;
              setFrom(v);
              if (v > to) setTo(v);
            }}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">To</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Category</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | "")}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end justify-end gap-2 pb-2">
          <button
            type="button"
            onClick={() => setMonthRange(0)}
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            This month
          </button>
          <button
            type="button"
            onClick={() => setMonthRange(-1)}
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            Last month
          </button>
        </div>
      </section>

      {summary.byCategory.length > 0 && (
        <section className="mt-6 border border-input p-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Breakdown by category
          </h2>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {summary.byCategory.map(([cat, info]) => (
              <span key={cat} className="flex items-baseline gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {cat}
                </span>
                <span className="tabular-nums text-foreground">
                  {formatMoney(info.total, info.currency)}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {error && (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <section className="mt-8 overflow-x-auto border border-input">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <Th>Date</Th>
              <Th>Category</Th>
              <Th>Vendor</Th>
              <Th className="text-right">Amount</Th>
              <Th>Currency</Th>
              <Th>Notes</Th>
              <Th className="text-right">Edit</Th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No expenses in this range. Click "Add expense" to log one.
                </td>
              </tr>
            )}
            {items.map((e) => (
              <tr key={e.id} className="border-t border-input">
                <Td className="font-mono tabular-nums">{e.date}</Td>
                <Td className="font-mono text-xs">{e.category}</Td>
                <Td>{e.vendor ?? "—"}</Td>
                <Td className="text-right tabular-nums">
                  {e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Td>
                <Td>{e.currency}</Td>
                <Td className="max-w-xs truncate text-muted-foreground">{e.notes ?? "—"}</Td>
                <Td className="text-right">
                  <Link
                    to="/admin/expenses/$id"
                    params={{ id: e.id }}
                    className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                  >
                    Edit →
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
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
