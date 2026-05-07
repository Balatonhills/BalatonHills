import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import clubhouse from "@/assets/clubhouse.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Balaton Hills" },
      {
        name: "description",
        content:
          "The story of Balaton Hills Golf Club — a Hungarian sanctuary for the game of golf.",
      },
      { property: "og:title", content: "About — Balaton Hills" },
      { property: "og:description", content: "Our story, our setting, our standards." },
      { property: "og:image", content: clubhouse },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <Header />
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
              basalt hills and the silver expanse of Lake Balaton, the estate honours a
              centuries-old Hungarian sense of place.
            </p>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              From the stone clubhouse to the bent-grass greens, every detail is shaped by the
              conviction that the finest golf is the slowest — walked, savoured, and earned.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
