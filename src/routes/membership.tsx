import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Membership — Balaton Hills" },
      { name: "description", content: "Private membership at Balaton Hills Estate & Links." },
      { property: "og:title", content: "Membership — Balaton Hills" },
      { property: "og:description", content: "Private membership at Balaton Hills." },
    ],
  }),
  component: MembershipPage,
});

const tiers = [
  {
    name: "Estate Member",
    price: "On Application",
    perks: ["Unlimited play, both courses", "Reciprocal rights worldwide", "Reserved locker & bag storage", "Priority restaurant reservations"],
  },
  {
    name: "Country Member",
    price: "On Application",
    perks: ["Unlimited weekday play", "30 weekend rounds annually", "Member-rate guest invitations", "Clubhouse privileges"],
  },
  {
    name: "Junior Member",
    price: "On Application",
    perks: ["For players under 25", "Full course access", "Coaching programme included", "Junior tournament entry"],
  },
];

function MembershipPage() {
  return (
    <>
      <Header />
      <main className="pt-32">
        <section className="container-prose text-center pb-16">
          <span className="eyebrow">Private Membership</span>
          <h1 className="mt-6 font-display text-5xl md:text-7xl">A Place to Belong</h1>
          <div className="mt-8 flex justify-center"><span className="gold-rule" /></div>
          <p className="mt-8 max-w-2xl mx-auto text-lg text-muted-foreground">
            Membership at Balaton Hills is offered by invitation and recommendation —
            an enduring connection to the estate, the courses, and a community
            of likeminded players.
          </p>
        </section>
        <section className="container-prose pb-24 grid md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <div key={t.name} className="border border-border p-10 bg-card">
              <h3 className="font-display text-2xl">{t.name}</h3>
              <div className="mt-2 text-xs tracking-[0.25em] uppercase text-gold">{t.price}</div>
              <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
                {t.perks.map((p) => (
                  <li key={p} className="flex gap-3"><span className="text-gold">—</span>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
