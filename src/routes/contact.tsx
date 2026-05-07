import { createFileRoute } from "@tanstack/react-router";
import heroPoster from "@/assets/hero-poster.jpg";
import { getMetadata, type RouteMetadata } from "@/lib/site-metadata";

export const Route = createFileRoute("/contact")({
  loader: async () => ({ meta: await getMetadata("/contact") }),
  head: (ctx?: { loaderData?: { meta?: RouteMetadata } }) => {
    const m = ctx?.loaderData?.meta;
    return {
      meta: [
        { title: m?.title ?? "Contact — Balaton Hills" },
        {
          name: "description",
          content: m?.description ?? "Visit, write or call Balaton Hills Golf Club.",
        },
        { property: "og:title", content: m?.og_title ?? "Contact — Balaton Hills" },
        {
          property: "og:description",
          content: m?.og_description ?? "Get in touch with Balaton Hills.",
        },
        { property: "og:image", content: m?.og_image ?? heroPoster },
      ],
      links: [{ rel: "canonical", href: m?.canonical ?? "https://www.balatonhills.com/contact" }],
    };
  },
  component: ContactPage,
});

function ContactPage() {
  return (
    <main className="pt-32">
      <section className="container-prose text-center pb-16">
        <span className="eyebrow">Contact</span>
        <h1 className="mt-6 font-display text-5xl md:text-7xl">Find Us at the Lake</h1>
        <div className="mt-8 flex justify-center">
          <span className="gold-rule" />
        </div>
      </section>
      <section className="container-prose pb-24 grid md:grid-cols-3 gap-8 text-center">
        {[
          { label: "Visit", value: "Balatonfüred\nVeszprém, Hungary" },
          { label: "Call", value: "+36 1 000 0000" },
          { label: "Write", value: "welcome@balatonhills.hu" },
        ].map((b) => (
          <div key={b.label} className="border border-border p-10 bg-card">
            <div className="text-xs tracking-[0.3em] uppercase text-gold">{b.label}</div>
            <div className="mt-4 whitespace-pre-line text-foreground">{b.value}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
