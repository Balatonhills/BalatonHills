import { createFileRoute } from "@tanstack/react-router";
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

const BAND_COUNT = 4;

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
  for (let i = 0; i < 31 && cur <= to; i++) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

function TeeTimesPage() {
  const today = isoDate(new Date());
  const [course, setCourse] = useState<string>(TEE_TIME_COURSES[0].slug);
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
    listTeeTimes({ from: fromISO, to: toISO, course_slug: course, includeCancelled })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [course, from, to, includeCancelled]);

  const memberById = useMemo(() => {
    const m = new Map<string, Member>();
    for (const x of members) m.set(x.id, x);
    return m;
  }, [members]);

  /** Single-course view: map keyed by exact ISO. */
  const occupied = useMemo(() => {
    const m = new Map<string, TeeTime>();
    for (const t of items) m.set(t.starts_at, t);
    return m;
  }, [items]);

  const days = useMemo(
    () => (from && to && from <= to ? eachDayInRange(from, to) : []),
    [from, to],
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="border-b border-input pb-6">
        <h1 className="font-display text-3xl text-foreground">Tee sheet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          10-minute slots, 07:00 – 19:00. Click any slot to book or edit.
        </p>
      </header>

      <nav className="mt-6 flex border-b border-input">
        {TEE_TIME_COURSES.map((c) => {
          const active = c.slug === course;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCourse(c.slug)}
              className={
                "px-5 py-3 text-xs uppercase tracking-[0.2em] transition-colors " +
                (active
                  ? "border-b-2 border-gold text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {c.label}
            </button>
          );
        })}
      </nav>

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

      <Legend />

      {error && (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

      <section className="mt-6 space-y-10">
        {days.map((day) => (
          <DaySheet
            key={day}
            day={day}
            course={course}
            occupied={occupied}
            memberById={memberById}
            includeCancelled={includeCancelled}
          />
        ))}
      </section>
    </main>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <LegendSwatch className="bg-emerald-50 border-emerald-200" label="Open" />
      <LegendSwatch className="bg-amber-50 border-amber-300" label="Booked / confirmed" />
      <LegendSwatch className="bg-stone-100 border-stone-300" label="Blocked" />
      <LegendSwatch className="bg-red-50 border-red-200" label="No-show" />
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={"inline-block h-3 w-5 border " + className} />
      {label}
    </span>
  );
}

function DaySheet({
  day,
  course,
  occupied,
  memberById,
  includeCancelled,
}: {
  day: string;
  course: string;
  occupied: Map<string, TeeTime>;
  memberById: Map<string, Member>;
  includeCancelled: boolean;
}) {
  const slots = generateSlotsForDate(day);
  const perBand = Math.ceil(slots.length / BAND_COUNT);
  const bands: string[][] = [];
  for (let i = 0; i < BAND_COUNT; i++) {
    bands.push(slots.slice(i * perBand, (i + 1) * perBand));
  }

  return (
    <div>
      <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {formatDayHeading(day)}
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {bands.map((bandSlots, i) => (
          <BandColumn
            key={i}
            slots={bandSlots}
            course={course}
            occupied={occupied}
            memberById={memberById}
            includeCancelled={includeCancelled}
          />
        ))}
      </div>
    </div>
  );
}

function BandColumn({
  slots,
  course,
  occupied,
  memberById,
  includeCancelled,
}: {
  slots: string[];
  course: string;
  occupied: Map<string, TeeTime>;
  memberById: Map<string, Member>;
  includeCancelled: boolean;
}) {
  if (slots.length === 0) return null;
  const first = formatTime(slots[0]);
  const last = formatTime(slots[slots.length - 1]);
  return (
    <div>
      <div className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
        {first} – {last}
      </div>
      <ul className="divide-y divide-input border border-input">
        {slots.map((slotISO) => {
          const row = occupied.get(slotISO);
          if (row && (includeCancelled || row.status !== "cancelled")) {
            return <BookedCell key={slotISO} row={row} memberById={memberById} slotISO={slotISO} />;
          }
          return <OpenCell key={slotISO} slotISO={slotISO} courseSlug={course} />;
        })}
      </ul>
    </div>
  );
}

function OpenCell({ slotISO, courseSlug }: { slotISO: string; courseSlug: string }) {
  const href = `/admin/tee-times/new?block=false&starts_at=${encodeURIComponent(slotISO)}&course_slug=${encodeURIComponent(courseSlug)}`;
  return (
    <li>
      <a
        href={href}
        className="flex items-center justify-between gap-2 bg-emerald-50 px-3 py-2 text-sm transition-colors hover:bg-emerald-100"
      >
        <span className="font-mono tabular-nums text-foreground">{formatTime(slotISO)}</span>
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-emerald-900">Open</span>
      </a>
    </li>
  );
}

function BookedCell({
  row,
  memberById,
  slotISO,
}: {
  row: TeeTime;
  memberById: Map<string, Member>;
  slotISO: string;
}) {
  const isBlocked = row.status === "blocked";
  const isCancelled = row.status === "cancelled";
  const isNoShow = row.status === "no-show";
  const primary = isBlocked
    ? null
    : row.primary_member_id
      ? (memberById.get(row.primary_member_id)?.full_name ?? "—")
      : (row.guest_name ?? "Guest");

  const bg = isBlocked
    ? "bg-stone-100 hover:bg-stone-200"
    : isNoShow
      ? "bg-red-50 hover:bg-red-100"
      : "bg-amber-50 hover:bg-amber-100";
  const dim = isCancelled ? "opacity-50 line-through" : "";

  const href = `/admin/tee-times/${row.id}?block=false`;
  return (
    <li>
      <a
        href={href}
        className={`flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${bg} ${dim}`}
      >
        <span className="flex items-baseline gap-2">
          <span className="font-mono tabular-nums text-foreground">{formatTime(slotISO)}</span>
          {isBlocked ? (
            <span className="italic text-stone-600">{row.block_reason || "Blocked"}</span>
          ) : (
            <>
              <span className="text-foreground">{primary}</span>
              <span className="text-xs text-muted-foreground">· {row.party_size}</span>
            </>
          )}
        </span>
        <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
          {row.status}
        </span>
      </a>
    </li>
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
