import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { EDITABLE_ROUTES, invalidateMetadataCache, type RouteMetadata } from "@/lib/site-metadata";

export const Route = createFileRoute("/admin/website")({
  head: () => ({
    meta: [{ title: "Website — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: WebsitePage,
});

type FormState = {
  title: string;
  description: string;
  og_title: string;
  og_description: string;
  og_image: string;
  canonical: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  og_title: "",
  og_description: "",
  og_image: "",
  canonical: "",
};

function rowToForm(row: RouteMetadata | undefined): FormState {
  if (!row) return EMPTY_FORM;
  return {
    title: row.title ?? "",
    description: row.description ?? "",
    og_title: row.og_title ?? "",
    og_description: row.og_description ?? "",
    og_image: row.og_image ?? "",
    canonical: row.canonical ?? "",
  };
}

function WebsitePage() {
  const [rows, setRows] = useState<Map<string, RouteMetadata>>(new Map());
  const [activePath, setActivePath] = useState<string>(EDITABLE_ROUTES[0].path);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function refresh() {
    setLoading(true);
    const { data, error } = await getSupabase().from("site_metadata").select("*");
    if (error) {
      setStatus({ kind: "err", msg: error.message });
      setLoading(false);
      return;
    }
    const map = new Map<string, RouteMetadata>();
    for (const row of (data ?? []) as RouteMetadata[]) map.set(row.route_path, row);
    setRows(map);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setForm(rowToForm(rows.get(activePath)));
    setStatus(null);
  }, [activePath, rows]);

  const activeLabel = useMemo(
    () => EDITABLE_ROUTES.find((r) => r.path === activePath)?.label ?? activePath,
    [activePath],
  );

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const payload = {
      route_path: activePath,
      title: form.title || null,
      description: form.description || null,
      og_title: form.og_title || null,
      og_description: form.og_description || null,
      og_image: form.og_image || null,
      canonical: form.canonical || null,
    };
    const { error } = await getSupabase()
      .from("site_metadata")
      .upsert(payload, { onConflict: "route_path" });
    setSaving(false);
    if (error) {
      setStatus({ kind: "err", msg: error.message });
      return;
    }
    invalidateMetadataCache();
    setStatus({ kind: "ok", msg: "Saved" });
    refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="border-b border-input pb-6">
        <h1 className="font-display text-3xl text-foreground">Website</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit public-site metadata. Changes go live within 60 seconds.
        </p>
      </header>

      <section className="mt-8">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Page</span>
          <select
            value={activePath}
            onChange={(e) => setActivePath(e.target.value)}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {EDITABLE_ROUTES.map((r) => (
              <option key={r.path} value={r.path}>
                {r.label} ({r.path})
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={onSave} className="mt-8 space-y-6">
          <h2 className="font-display text-xl text-foreground">{activeLabel}</h2>

          <Field
            label="Title"
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
          />
          <Field
            label="Description"
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            multiline
          />
          <Field
            label="Open Graph title"
            value={form.og_title}
            onChange={(v) => setForm({ ...form, og_title: v })}
          />
          <Field
            label="Open Graph description"
            value={form.og_description}
            onChange={(v) => setForm({ ...form, og_description: v })}
            multiline
          />
          <Field
            label="Open Graph image URL"
            value={form.og_image}
            onChange={(v) => setForm({ ...form, og_image: v })}
            hint="Leave blank to use the page's built-in image."
          />
          <Field
            label="Canonical URL"
            value={form.canonical}
            onChange={(v) => setForm({ ...form, canonical: v })}
            hint="The site-wide row ignores this field."
          />

          <div className="flex items-center gap-4 border-t border-input pt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
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
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: string;
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
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
