import { createFileRoute } from "@tanstack/react-router";
import clubhouse from "@/assets/clubhouse.jpg";
import { getMetadata, type RouteMetadata } from "@/lib/site-metadata";

export const Route = createFileRoute("/about")({
  loader: async () => ({ meta: await getMetadata("/about") }),
  head: (ctx?: { loaderData?: { meta?: RouteMetadata } }) => {
    const m = ctx?.loaderData?.meta;
    return {
      meta: [
        { title: m?.title ?? "About — Balaton Hills" },
        {
          name: "description",
          content:
            m?.description ??
            "The story of Balaton Hills Golf Club — a Hungarian sanctuary for the game of golf.",
        },
        { property: "og:title", content: m?.og_title ?? "About — Balaton Hills" },
        {
          property: "og:description",
          content: m?.og_description ?? "Our story, our setting, our standards.",
        },
        { property: "og:image", content: m?.og_image ?? clubhouse },
      ],
      links: [{ rel: "canonical", href: m?.canonical ?? "https://www.balatonhills.com/about" }],
    };
  },
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="pt-32">
      <section className="container-prose text-center pb-16">
        <span className="eyebrow">Our Story</span>
        <h1 className="mt-6 font-display text-5xl md:text-7xl">A Heritage in the Making</h1>
        <div className="mt-8 flex justify-center">
          <span className="gold-rule" />
        </div>
      </section>
      <section className="container-prose grid lg:grid-cols-2 gap-12 items-center pb-24">
        <img
          src={clubhouse}
          alt="Clubhouse"
          className="w-full aspect-[4/3] object-cover"
          loading="lazy"
        />
        <div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Balaton Hills was founded with a singular ambition: to bring the traditions of
            championship golf to one of Europe's most evocative landscapes. Set between vineyards,
            basalt hills and the silver expanse of Lake Balaton, the estate honours a centuries-old
            Hungarian sense of place.
          </p>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            From the stone clubhouse to the bent-grass greens, every detail is shaped by the
            conviction that the finest golf is the slowest — walked, savoured, and earned.
          </p>
        </div>
      </section>
    </main>
  );
}
