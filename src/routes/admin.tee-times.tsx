import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listMembers, type Member } from "@/lib/members";
import {
  generateSlotsForDate,
  listTeeTimes,
  TEE_TIME_COURSES,
  type TeeTime,
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

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function eachDayInRange(from: string, to: string): string[] {
  const days: string[] = [];
  let cur = from;
  // safety cap at 31 days
  for (let i = 0; i < 31 && cur <= to; i++) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

function TeeTimesPage() {
  const today = isoDate(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
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
    const fromISO = new Date(`${from}T00:00:00`).toISOString();
    const toISO = new Date(`${to}T23:59:59.999`).toISOString();
    listTeeTimes({ from: fromISO, to: toISO, includeCancelled })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [from, to, includeCancelled]);

  const memberById = useMemo(() => {
    const m = new Map<string, Member>();
    for (const x of members) m.set(x.id, x);
    return m;
  }, [members]);

  /** Key existing rows by `${ISO}__${course_slug}` for O(1) cell lookup. */
  const occupied = useMemo(() => {
    const m = new Map<string, TeeTime>();
    for (const t of items) m.set(`${t.starts_at}__${t.course_slug}`, t);
    return m;
  }, [items]);

  const days = useMemo(
    () => (from && to && from <= to ? eachDayInRange(from, to) : []),
    [from, to],
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-input pb-6">
        <div>
          <h1 className="font-display text-3xl text-foreground">Tee sheet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            10-minute slots, 07:00 – 19:00, both courses.{" "}
            {loading
              ? "Loading…"
              : `${items.length} booking${items.length === 1 ? "" : "s"} in range.`}
          </p>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
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
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={includeCancelled}
            onChange={(e) => setIncludeCancelled(e.target.checked)}
            className="h-4 w-4 border border-input"
          />
          <span className="text-sm text-foreground">Show cancelled</span>
        </label>
        <div className="flex items-end justify-end gap-2 pb-2">
          <button
            type="button"
            onClick={() => {
              setFrom(today);
              setTo(today);
            }}
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setTo(addDays(from, 6))}
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            Next 7
          </button>
        </div>
      </section>

      {error && (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <section className="mt-8 space-y-10">
        {days.map((day) => (
          <DaySheet
            key={day}
            day={day}
            occupied={occupied}
            memberById={memberById}
            includeCancelled={includeCancelled}
          />
        ))}
      </section>
    </main>
  );
}

function DaySheet({
  day,
  occupied,
  memberById,
  includeCancelled,
}: {
  day: string;
  occupied: Map<string, TeeTime>;
  memberById: Map<string, Member>;
  includeCancelled: boolean;
}) {
  const slots = generateSlotsForDate(day);
  return (
    <div>
      <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {formatDayHeading(day)}
      </h2>
      <div className="mt-3 overflow-x-auto border border-input">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <Th className="w-24">Time</Th>
              {TEE_TIME_COURSES.map((c) => (
                <Th key={c.slug}>{c.label}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slotISO) => (
              <tr key={slotISO} className="border-t border-input">
                <Td className="font-mono tabular-nums text-muted-foreground">
                  {formatTime(slotISO)}
                </Td>
                {TEE_TIME_COURSES.map((c) => {
                  const row = occupied.get(`${slotISO}__${c.slug}`);
                  if (row && (includeCancelled || row.status !== "cancelled")) {
                    return <BookedCell key={c.slug} row={row} memberById={memberById} />;
                  }
                  return <OpenCell key={c.slug} slotISO={slotISO} courseSlug={c.slug} />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OpenCell({ slotISO, courseSlug }: { slotISO: string; courseSlug: string }) {
  return (
    <td className="p-0">
      <Link
        to="/admin/tee-times/$id"
        params={{ id: "new" }}
        search={{ block: false, starts_at: slotISO, course_slug: courseSlug }}
        className="flex h-full w-full items-center px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
      >
        Open
      </Link>
    </td>
  );
}

function BookedCell({ row, memberById }: { row: TeeTime; memberById: Map<string, Member> }) {
  const primary =
    row.status === "blocked"
      ? null
      : row.primary_member_id
        ? (memberById.get(row.primary_member_id)?.full_name ?? "—")
        : (row.guest_name ?? "Guest");
  const dim = row.status === "cancelled" ? "opacity-50" : "";
  return (
    <td className={"p-0 " + dim}>
      <Link
        to="/admin/tee-times/$id"
        params={{ id: row.id }}
        search={{ block: false, starts_at: undefined, course_slug: undefined }}
        className="flex h-full w-full flex-wrap items-center gap-2 px-4 py-3 text-foreground transition-colors hover:bg-secondary/40"
      >
        {row.status === "blocked" ? (
          <span className="italic text-muted-foreground">{row.block_reason || "Blocked"}</span>
        ) : (
          <>
            <span className="font-medium">{primary}</span>
            <span className="text-xs text-muted-foreground">· party {row.party_size}</span>
          </>
        )}
        <span className="ml-auto text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          {row.status}
        </span>
      </Link>
    </td>
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
  return <td className={"px-4 py-3 " + (className ?? "")}>{children}</td>;
}
