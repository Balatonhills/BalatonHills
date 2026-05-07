import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import restaurant from "@/assets/restaurant.jpg";

export const Route = createFileRoute("/restaurant")({
  head: () => ({
    meta: [
      { title: "The Restaurant — Balaton Hills" },
      { name: "description", content: "Seasonal Hungarian cuisine and Balaton Uplands wines, served above the 18th green." },
      { property: "og:title", content: "The Restaurant — Balaton Hills" },
      { property: "og:description", content: "Dining at Balaton Hills." },
      { property: "og:image", content: restaurant },
    ],
  }),
  component: RestaurantPage,
});

function RestaurantPage() {
  return (
    <>
      <Header />
      <main className="pt-32">
        <section className="container-prose text-center pb-16">
          <span className="eyebrow">The Restaurant</span>
          <h1 className="mt-6 font-display text-5xl md:text-7xl">A Table Above the 18th</h1>
          <div className="mt-8 flex justify-center"><span className="gold-rule" /></div>
        </section>
        <section className="container-prose grid lg:grid-cols-2 gap-12 items-center pb-24">
          <img src={restaurant} alt="Restaurant" className="w-full aspect-[4/3] object-cover" loading="lazy" />
          <div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Our kitchen draws on the bounty of the Balaton Uplands — Mangalica
              pork from neighbouring farms, fogas from the lake, herbs from the
              estate garden — finished with a cellar of the region's finest
              white wines.
            </p>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Open daily for breakfast, lunch and dinner. Reservations recommended.
            </p>
            <a href="mailto:dining@balatonhills.hu" className="mt-8 inline-flex bg-primary text-primary-foreground px-6 py-3 text-xs tracking-[0.25em] uppercase">
              Reserve a Table
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
