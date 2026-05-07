import { createFileRoute } from "@tanstack/react-router";
import heroPoster from "@/assets/hero-poster.jpg";
import { getMetadata, type RouteMetadata } from "@/lib/site-metadata";

export const Route = createFileRoute("/membership")({
  loader: async () => ({ meta: await getMetadata("/membership") }),
  head: (ctx?: { loaderData?: { meta?: RouteMetadata } }) => {
    const m = ctx?.loaderData?.meta;
    return {
      meta: [
        { title: m?.title ?? "Membership — Balaton Hills" },
        {
          name: "description",
          content: m?.description ?? "Private membership at Balaton Hills Golf Club.",
        },
        { property: "og:title", content: m?.og_title ?? "Membership — Balaton Hills" },
        {
          property: "og:description",
          content: m?.og_description ?? "Private membership at Balaton Hills.",
        },
        { property: "og:image", content: m?.og_image ?? heroPoster },
      ],
      links: [
        { rel: "canonical", href: m?.canonical ?? "https://www.balatonhills.com/membership" },
      ],
    };
  },
  component: MembershipPage,
});

const tiers = [
  {
    name: "Estate Member",
    price: "On Application",
    perks: [
      "Unlimited play, both courses",
      "Reciprocal rights worldwide",
      "Reserved locker & bag storage",
      "Priority restaurant reservations",
    ],
  },
  {
    name: "Country Member",
    price: "On Application",
    perks: [
      "Unlimited weekday play",
      "30 weekend rounds annually",
      "Member-rate guest invitations",
      "Clubhouse privileges",
    ],
  },
  {
    name: "Junior Member",
    price: "On Application",
    perks: [
      "For players under 25",
      "Full course access",
      "Coaching programme included",
      "Junior tournament entry",
    ],
  },
];

function MembershipPage() {
  return (
    <main className="pt-32">
      <section className="container-prose text-center pb-16">
        <span className="eyebrow">Private Membership</span>
        <h1 className="mt-6 font-display text-5xl md:text-7xl">A Place to Belong</h1>
        <div className="mt-8 flex justify-center">
          <span className="gold-rule" />
        </div>
        <p className="mt-8 max-w-2xl mx-auto text-lg text-muted-foreground">
          Membership at Balaton Hills is offered by invitation and recommendation — an enduring
          connection to the estate, the courses, and a community of likeminded players.
        </p>
      </section>
      <section className="container-prose pb-24 grid md:grid-cols-3 gap-6">
        {tiers.map((t) => (
          <div key={t.name} className="border border-border p-10 bg-card">
            <h3 className="font-display text-2xl">{t.name}</h3>
            <div className="mt-2 text-xs tracking-[0.25em] uppercase text-gold">{t.price}</div>
            <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
              {t.perks.map((p) => (
                <li key={p} className="flex gap-3">
                  <span className="text-gold">—</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
