import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listMembers, type Member } from "@/lib/members";
import {
  createTeeTime,
  deleteTeeTime,
  getTeeTime,
  snapToSlot,
  TEE_TIME_COURSES,
  TEE_TIME_STATUSES,
  updateTeeTime,
  type TeeTime,
  type TeeTimeInput,
  type TeeTimeStatus,
} from "@/lib/tee-times";

export const Route = createFileRoute("/admin/tee-times/$id")({
  head: () => ({
    meta: [{ title: "Tee time — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    block: search.block === true || search.block === "true" || search.block === "1",
    starts_at: typeof search.starts_at === "string" ? search.starts_at : undefined,
    course_slug: typeof search.course_slug === "string" ? search.course_slug : undefined,
  }),
  component: TeeTimeEditPage,
});

type FormState = {
  starts_at: string;
  course_slug: string;
  party_size: string;
  primary_member_id: string;
  guest_name: string;
  guest_phone: string;
  status: TeeTimeStatus;
  block_reason: string;
  notes: string;
};

function defaultFormState(opts: {
  blockMode: boolean;
  startsAtISO?: string;
  courseSlug?: string;
}): FormState {
  return {
    starts_at: opts.startsAtISO ? isoToLocalInput(opts.startsAtISO) : nextRoundHour(),
    course_slug: opts.courseSlug || "forest-hills",
    party_size: "1",
    primary_member_id: "",
    guest_name: "",
    guest_phone: "",
    status: opts.blockMode ? "blocked" : "booked",
    block_reason: "",
    notes: "",
  };
}

function nextRoundHour(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInput(d);
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoToLocalInput(iso: string): string {
  return toLocalInput(new Date(iso));
}

function teeTimeToForm(t: TeeTime): FormState {
  return {
    starts_at: isoToLocalInput(t.starts_at),
    course_slug: t.course_slug,
    party_size: String(t.party_size),
    primary_member_id: t.primary_member_id ?? "",
    guest_name: t.guest_name ?? "",
    guest_phone: t.guest_phone ?? "",
    status: t.status,
    block_reason: t.block_reason ?? "",
    notes: t.notes ?? "",
  };
}

function formToInput(f: FormState): TeeTimeInput | null {
  if (!f.starts_at) return null;
  const date = new Date(f.starts_at);
  if (Number.isNaN(date.getTime())) return null;
  const party = Number.parseInt(f.party_size, 10);
  if (!Number.isFinite(party) || party < 1) return null;
  const isBlocked = f.status === "blocked";
  return {
    starts_at: snapToSlot(date.toISOString()),
    course_slug: f.course_slug,
    party_size: party,
    primary_member_id: isBlocked ? null : f.primary_member_id || null,
    guest_name: isBlocked ? null : f.guest_name.trim() || null,
    guest_phone: isBlocked ? null : f.guest_phone.trim() || null,
    status: f.status,
    block_reason: isBlocked ? f.block_reason.trim() || null : null,
    notes: f.notes.trim() || null,
  };
}

function TeeTimeEditPage() {
  const { id } = Route.useParams();
  const { block, starts_at, course_slug } = Route.useSearch();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState<FormState>(() =>
    defaultFormState({ blockMode: block, startsAtISO: starts_at, courseSlug: course_slug }),
  );
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    listMembers()
      .then(setMembers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) {
      setForm(
        defaultFormState({ blockMode: block, startsAtISO: starts_at, courseSlug: course_slug }),
      );
      setLoading(false);
      setNotFound(false);
      return;
    }
    setLoading(true);
    getTeeTime(id)
      .then((t) => {
        if (!t) setNotFound(true);
        else setForm(teeTimeToForm(t));
      })
      .catch((e) => setStatus({ kind: "err", msg: e instanceof Error ? e.message : "Failed" }))
      .finally(() => setLoading(false));
  }, [id, isNew, block, starts_at, course_slug]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const input = formToInput(form);
    if (!input) {
      setStatus({ kind: "err", msg: "Start time and party size are required." });
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = await createTeeTime(input);
        navigate({
          to: "/admin/tee-times/$id",
          params: { id: created.id },
          search: { block: false, starts_at: undefined, course_slug: undefined },
          replace: true,
        });
      } else {
        await updateTeeTime(id, input);
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
    if (!window.confirm("Delete this tee time? This cannot be undone.")) return;
    setSaving(true);
    setStatus(null);
    try {
      await deleteTeeTime(id);
      navigate({ to: "/admin/tee-times" });
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Delete failed" });
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-muted-foreground">Tee time not found.</p>
        <Link
          to="/admin/tee-times"
          className="mt-4 inline-block text-xs uppercase tracking-[0.2em] text-foreground underline"
        >
          ← Back to tee times
        </Link>
      </main>
    );
  }

  const isBlocked = form.status === "blocked";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/admin/tee-times"
        className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        ← Back to tee times
      </Link>
      <header className="mt-4 border-b border-input pb-6">
        <h1 className="font-display text-3xl text-foreground">
          {isNew ? (isBlocked ? "Block slot" : "New booking") : "Edit tee time"}
        </h1>
      </header>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={onSave} className="mt-8 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Start
              </span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
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
                {TEE_TIME_COURSES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Party size
              </span>
              <input
                type="number"
                min={1}
                max={8}
                value={form.party_size}
                onChange={(e) => setForm({ ...form, party_size: e.target.value })}
                className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Status
              </span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TeeTimeStatus })}
                className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TEE_TIME_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isBlocked ? (
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Block reason
              </span>
              <input
                type="text"
                placeholder="e.g. Tournament, maintenance"
                value={form.block_reason}
                onChange={(e) => setForm({ ...form, block_reason: e.target.value })}
                className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          ) : (
            <>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Primary member
                </span>
                <select
                  value={form.primary_member_id}
                  onChange={(e) => setForm({ ...form, primary_member_id: e.target.value })}
                  className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— guest —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </label>

              {!form.primary_member_id && (
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Guest name
                    </span>
                    <input
                      type="text"
                      value={form.guest_name}
                      onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                      className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Guest phone
                    </span>
                    <input
                      type="tel"
                      value={form.guest_phone}
                      onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                      className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                </div>
              )}
            </>
          )}

          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <div className="flex items-center gap-4 border-t border-input pt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : isNew ? "Create" : "Save"}
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
