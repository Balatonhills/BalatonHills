import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Book a Tee Time — Balaton Hills" },
      {
        name: "description",
        content: "Reserve a tee time on The Lakeside Links or The Hillside Estate.",
      },
      { property: "og:title", content: "Book a Tee Time — Balaton Hills" },
      { property: "og:description", content: "Reserve a tee time at Balaton Hills." },
    ],
  }),
  component: BookingPage,
});

function BookingPage() {
  return (
    <>
      <Header />
      <main className="pt-32 pb-24">
        <section className="container-prose text-center pb-16">
          <span className="eyebrow">The Booking Desk</span>
          <h1 className="mt-6 font-display text-5xl md:text-7xl">Reserve Your Round</h1>
          <div className="mt-8 flex justify-center">
            <span className="gold-rule" />
          </div>
          <p className="mt-8 max-w-2xl mx-auto text-lg text-muted-foreground">
            Select a course below to open its live availability. Bookings are powered by Golfigo.
          </p>
        </section>

        <section className="container-prose grid md:grid-cols-2 gap-8">
          {[
            { name: "Forest Hills", stats: "18 Tees · 9 Greens · Par 70" },
            { name: "Vadrósza", stats: "9 Holes · Par 33" },
          ].map((c) => (
            <div key={c.name} className="border border-border bg-card p-10">
              <div className="text-[0.65rem] tracking-[0.3em] uppercase text-gold">{c.stats}</div>
              <h2 className="mt-3 font-display text-3xl">{c.name}</h2>
              <div className="mt-8 aspect-[4/3] bg-secondary/60 border border-dashed border-border flex items-center justify-center text-center p-8">
                <div>
                  <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground">
                    Golfigo Widget
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground max-w-xs">
                    Booking widget for {c.name} will be embedded here.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
