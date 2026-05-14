import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  countMembersByStatus,
  countRenewalsDueWithin,
  listMembers,
  type Member,
} from "@/lib/members";
import {
  countTeeTimesBetween,
  listTeeTimes,
  TEE_TIME_COURSES,
  type TeeTime,
} from "@/lib/tee-times";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin — Balaton Hills" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminIndex,
});

type Module = { to: string; title: string; description: string };

const MODULES: ReadonlyArray<Module> = [
  {
    to: "/admin/website",
    title: "Website",
    description: "Page titles, descriptions, and Open Graph tags across the public site.",
  },
  {
    to: "/admin/memberships",
    title: "Memberships",
    description: "Tier names, perks, and pricing shown on the public membership page.",
  },
  {
    to: "/admin/members",
    title: "Members",
    description: "Directory of members — contact info, tier, renewal status.",
  },
  {
    to: "/admin/tee-times",
    title: "Tee times",
    description: "10-min slot tee sheet for both courses.",
  },
  {
    to: "/admin/pricing",
    title: "Pricing",
    description: "Green fees, cart hire, range buckets, lessons.",
  },
];

const TODAY_PREVIEW_LIMIT = 6;

function todayBoundsISO() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

function nextSevenBoundsISO() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return { from: start.toISOString(), to: end.toISOString() };
}

function AdminIndex() {
  const [activeMembers, setActiveMembers] = useState<number | null>(null);
  const [renewals, setRenewals] = useState<number | null>(null);
  const [bookingsToday, setBookingsToday] = useState<number | null>(null);
  const [bookingsWeek, setBookingsWeek] = useState<number | null>(null);
  const [todayList, setTodayList] = useState<TeeTime[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayBoundsISO();
    const week = nextSevenBoundsISO();
    Promise.all([
      countMembersByStatus("active"),
      countRenewalsDueWithin(30),
      countTeeTimesBetween(today.from, today.to),
      countTeeTimesBetween(week.from, week.to),
      listTeeTimes({ from: today.from, to: today.to, includeCancelled: false }),
      listMembers(),
    ])
      .then(([a, r, bt, bw, list, mems]) => {
        setActiveMembers(a);
        setRenewals(r);
        setBookingsToday(bt);
        setBookingsWeek(bw);
        setTodayList(list);
        setMembers(mems);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const memberById = useMemo(() => {
    const m = new Map<string, Member>();
    for (const x of members) m.set(x.id, x);
    return m;
  }, [members]);

  const previewList = todayList.slice(0, TODAY_PREVIEW_LIMIT);
  const remaining = Math.max(0, todayList.length - TODAY_PREVIEW_LIMIT);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl text-foreground">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Today at a glance. Pick a module below to drill in.
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active members"
          value={activeMembers}
          loading={loading}
          to="/admin/members"
        />
        <StatTile
          label="Renewals due (30d)"
          value={renewals}
          loading={loading}
          to="/admin/members"
          warn={(renewals ?? 0) > 0}
        />
        <StatTile
          label="Bookings today"
          value={bookingsToday}
          loading={loading}
          to="/admin/tee-times"
        />
        <StatTile
          label="Bookings next 7 days"
          value={bookingsWeek}
          loading={loading}
          to="/admin/tee-times"
        />
      </section>

      <section className="mt-10">
        <header className="flex items-baseline justify-between border-b border-input pb-3">
          <h2 className="font-display text-xl text-foreground">Today's tee times</h2>
          <Link
            to="/admin/tee-times"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            Open tee sheet →
          </Link>
        </header>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : previewList.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No bookings today.</p>
        ) : (
          <ul className="mt-6 divide-y divide-input border border-input">
            {previewList.map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <span className="font-mono tabular-nums text-foreground">
                  {formatTime(t.starts_at)}
                </span>
                <span className="text-muted-foreground">{courseLabel(t.course_slug)}</span>
                <span className="flex-1 text-foreground">
                  {t.status === "blocked" ? (
                    <span className="italic text-stone-600">{t.block_reason || "Blocked"}</span>
                  ) : t.primary_member_id ? (
                    (memberById.get(t.primary_member_id)?.full_name ?? "—")
                  ) : (
                    (t.guest_name ?? "Guest")
                  )}
                </span>
                <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {t.status}
                </span>
              </li>
            ))}
            {remaining > 0 && (
              <li className="px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                + {remaining} more
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl text-foreground">Manage</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <ModuleCard key={m.title} module={m} />
          ))}
        </div>
      </section>
    </main>
  );
}

function StatTile({
  label,
  value,
  loading,
  to,
  warn,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  to: string;
  warn?: boolean;
}) {
  return (
    <Link
      to={to}
      className="block border border-input bg-background p-5 transition-colors hover:border-gold"
    >
      <div className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div
        className={
          "mt-3 font-display text-4xl tabular-nums " + (warn ? "text-amber-700" : "text-foreground")
        }
      >
        {loading ? "—" : (value ?? 0)}
      </div>
    </Link>
  );
}

function ModuleCard({ module: m }: { module: Module }) {
  return (
    <Link
      to={m.to}
      className="block border border-input bg-background p-6 transition-colors hover:border-gold"
    >
      <h3 className="font-display text-xl text-foreground">{m.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
    </Link>
  );
}

function courseLabel(slug: string): string {
  return TEE_TIME_COURSES.find((c) => c.slug === slug)?.label ?? slug;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
