import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin — Balaton Hills" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminIndex,
});

type Module = {
  to?: string;
  title: string;
  description: string;
  status?: "live" | "soon";
};

const MODULES: ReadonlyArray<Module> = [
  {
    to: "/admin/metadata",
    title: "Site content",
    description: "Page titles, descriptions, and Open Graph tags across the public site.",
    status: "live",
  },
  {
    title: "Memberships",
    description: "Tier names, perks, and pricing shown on the public membership page.",
    status: "soon",
  },
  {
    title: "Members",
    description: "Directory of members — contact info, tier, renewal status.",
    status: "soon",
  },
  {
    title: "Tee times",
    description: "Internal booking sheet alongside Golfigo: view, create, block.",
    status: "soon",
  },
  {
    title: "Pricing",
    description: "Green fees, cart hire, range buckets, lessons.",
    status: "soon",
  },
];

function AdminIndex() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl text-foreground">Overview</h1>
      <p className="mt-2 text-sm text-muted-foreground">Pick a module to manage.</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <ModuleCard key={m.title} module={m} />
        ))}
      </div>
    </main>
  );
}

function ModuleCard({ module: m }: { module: Module }) {
  const isLive = m.status === "live" && m.to;
  const body = (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-foreground">{m.title}</h2>
        {!isLive && (
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            Coming soon
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
    </>
  );

  if (isLive && m.to) {
    return (
      <Link
        to={m.to}
        className="block border border-input bg-background p-6 transition-colors hover:border-gold"
      >
        {body}
      </Link>
    );
  }

  return <div className="block border border-input bg-background p-6 opacity-60">{body}</div>;
}
