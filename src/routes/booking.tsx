import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    golfigoWidget?: {
      widget?: { q: Array<() => void>; ready: (cb: () => void) => void };
      load?: (kind: string, opts: { club_id: number; id: number }) => void;
    };
  }
}

import { getMetadata, type RouteMetadata } from "@/lib/site-metadata";

export const Route = createFileRoute("/booking")({
  loader: async () => ({ meta: await getMetadata("/booking") }),
  head: (ctx?: { loaderData?: { meta?: RouteMetadata } }) => {
    const m = ctx?.loaderData?.meta;
    return {
      meta: [
        { title: m?.title ?? "Book a Tee Time — Balaton Hills" },
        {
          name: "description",
          content:
            m?.description ?? "Reserve a tee time on The Lakeside Links or The Hillside Estate.",
        },
        { property: "og:title", content: m?.og_title ?? "Book a Tee Time — Balaton Hills" },
        {
          property: "og:description",
          content: m?.og_description ?? "Reserve a tee time at Balaton Hills.",
        },
        ...(m?.og_image ? [{ property: "og:image", content: m.og_image }] : []),
      ],
      links: [{ rel: "canonical", href: m?.canonical ?? "https://www.balatonhills.com/booking" }],
    };
  },
  component: BookingPage,
});

const GOLFIGO_SRC = "https://api.golfigo.com/widget/";
const GOLFIGO_TIMEOUT_MS = 10_000;

function GolfigoTeeSheet({ clubId, id }: { clubId: number; id: number }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.golfigoWidget?.load) {
      window.golfigoWidget.load("teeSheet", { club_id: clubId, id });
      return;
    }

    let loaded = false;
    const markLoaded = () => {
      loaded = true;
    };

    const timeout = window.setTimeout(() => {
      if (!loaded) setFailed(true);
    }, GOLFIGO_TIMEOUT_MS);

    if (document.querySelector(`script[src="${GOLFIGO_SRC}"]`)) {
      // Another mount is already loading the script; wait for it via timeout above.
      return () => window.clearTimeout(timeout);
    }

    window.golfigoWidget = {
      widget: {
        q: [],
        ready(cb) {
          this.q.push(cb);
        },
      },
    };

    const script = document.createElement("script");
    script.src = GOLFIGO_SRC;
    script.async = true;
    script.onload = () => {
      markLoaded();
      window.golfigoWidget?.load?.("teeSheet", { club_id: clubId, id });
    };
    script.onerror = () => setFailed(true);
    document.head.appendChild(script);

    return () => window.clearTimeout(timeout);
  }, [clubId, id]);

  if (failed) {
    return (
      <div className="min-h-[24rem] bg-secondary/40 border border-border p-8 text-center flex flex-col items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-gold">Booking unavailable</div>
        <p className="mt-3 text-sm text-muted-foreground max-w-sm">
          Our online booking is temporarily unreachable. Please call{" "}
          <a className="text-foreground underline" href="tel:+3610000000">
            +36 1 000 0000
          </a>{" "}
          or email{" "}
          <a className="text-foreground underline" href="mailto:welcome@balatonhills.hu">
            welcome@balatonhills.hu
          </a>{" "}
          to reserve your round.
        </p>
      </div>
    );
  }

  return <div id="golfigo-widget" className="min-h-[24rem]" />;
}

function BookingPage() {
  return (
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
        <div className="border border-border bg-card p-10">
          <div className="text-[0.65rem] tracking-[0.3em] uppercase text-gold">
            18 Tees · 9 Greens · Par 70
          </div>
          <h2 className="mt-3 font-display text-3xl">Forest Hills</h2>
          <div className="mt-8">
            <GolfigoTeeSheet clubId={10} id={2} />
          </div>
        </div>

        <div className="border border-border bg-card p-10">
          <div className="text-[0.65rem] tracking-[0.3em] uppercase text-gold">
            9 Holes · Par 33
          </div>
          <h2 className="mt-3 font-display text-3xl">Vadrósza</h2>
          <div className="mt-8 aspect-[4/3] bg-secondary/60 border border-dashed border-border flex items-center justify-center text-center p-8">
            <div>
              <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground">
                Golfigo Widget
              </div>
              <p className="mt-3 text-sm text-muted-foreground max-w-xs">
                Booking widget for Vadrósza will be embedded here.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
