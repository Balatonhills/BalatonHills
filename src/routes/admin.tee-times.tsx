import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listMembers, type Member } from "@/lib/members";
import {
  listTeeTimes,
  TEE_TIME_COURSES,
  TEE_TIME_STATUSES,
  type TeeTime,
  type TeeTimeStatus,
} from "@/lib/tee-times";

export const Route = createFileRoute("/admin/tee-times")({
  head: () => ({
    meta: [{ title: "Tee times — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: TeeTimesPage,
});

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const today = new Date();
  const plus7 = new Date(today.getTime() + 7 * 86_400_000);
  return { from: isoDate(today), to: isoDate(plus7) };
}

function TeeTimesPage() {
  const [{ from, to }, setRange] = useState(defaultRange);
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<TeeTimeStatus | "">("");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [items, setItems] = useState<TeeTime[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMembers()
      .then(setMembers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fromISO = `${from}T00:00:00.000Z`;
    const toISO = `${to}T23:59:59.999Z`;
    listTeeTimes({
      from: fromISO,
      to: toISO,
      course_slug: courseFilter,
      status: statusFilter,
      includeCancelled,
    })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [from, to, courseFilter, statusFilter, includeCancelled]);

  const memberById = useMemo(() => {
    const m = new Map<string, Member>();
    for (const x of members) m.set(x.id, x);
    return m;
  }, [members]);

  const grouped = useMemo(() => {
    const map = new Map<string, TeeTime[]>();
    for (const t of items) {
      const day = t.starts_at.slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(t);
      map.set(day, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-input pb-6">
        <div>
          <h1 className="font-display text-3xl text-foreground">Tee times</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal booking sheet. {loading ? "Loading…" : `${items.length} entries.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/tee-times/$id"
            params={{ id: "new" }}
            search={{ block: false }}
            className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary/90"
          >
            New booking
          </Link>
          <Link
            to="/admin/tee-times/$id"
            params={{ id: "new" }}
            search={{ block: true }}
            className="border border-input px-6 py-3 text-xs uppercase tracking-[0.25em] text-foreground transition-colors hover:bg-secondary/40"
          >
            Block slot
          </Link>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Course</span>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All</option>
            {TEE_TIME_COURSES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TeeTimeStatus | "")}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Any</option>
            {TEE_TIME_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={includeCancelled}
            onChange={(e) => setIncludeCancelled(e.target.checked)}
            className="h-4 w-4 border border-input"
          />
          <span className="text-sm text-foreground">Include cancelled</span>
        </label>
      </section>

      {error && (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <section className="mt-8 space-y-8">
        {!loading && grouped.length === 0 && (
          <p className="text-sm text-muted-foreground">No tee times in this range.</p>
        )}
        {grouped.map(([day, list]) => (
          <div key={day}>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {formatDayHeading(day)}
            </h2>
            <div className="mt-3 overflow-x-auto border border-input">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <Th>Time</Th>
                    <Th>Course</Th>
                    <Th className="text-right">Party</Th>
                    <Th>Primary</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Edit</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr
                      key={t.id}
                      className={
                        "border-t border-input " + (t.status === "cancelled" ? "opacity-50" : "")
                      }
                    >
                      <Td className="font-mono tabular-nums">{formatTime(t.starts_at)}</Td>
                      <Td>{courseLabel(t.course_slug)}</Td>
                      <Td className="text-right tabular-nums">{t.party_size}</Td>
                      <Td>
                        {t.status === "blocked" ? (
                          <span className="italic text-muted-foreground">
                            {t.block_reason || "Blocked"}
                          </span>
                        ) : t.primary_member_id ? (
                          (memberById.get(t.primary_member_id)?.full_name ?? "—")
                        ) : (
                          (t.guest_name ?? "—")
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={t.status} />
                      </Td>
                      <Td className="text-right">
                        <Link
                          to="/admin/tee-times/$id"
                          params={{ id: t.id }}
                          search={{ block: false }}
                          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                        >
                          Edit →
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

function formatDayHeading(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function courseLabel(slug: string): string {
  return TEE_TIME_COURSES.find((c) => c.slug === slug)?.label ?? slug;
}

function StatusBadge({ status }: { status: TeeTimeStatus }) {
  const color =
    status === "booked" || status === "confirmed"
      ? "text-green-700"
      : status === "completed"
        ? "text-foreground"
        : status === "no-show"
          ? "text-amber-700"
          : status === "blocked"
            ? "text-muted-foreground"
            : "text-red-700";
  return <span className={"text-xs uppercase tracking-[0.2em] " + color}>{status}</span>;
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
