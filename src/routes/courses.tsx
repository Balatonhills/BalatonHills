import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import lakeside from "@/assets/course-lakeside.jpg";
import hillside from "@/assets/course-hillside.jpg";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Our Courses — Balaton Hills" },
      { name: "description", content: "Forest Hills and Vadrósza — two distinctive courses set above Lake Balaton." },
      { property: "og:title", content: "Our Courses — Balaton Hills" },
      { property: "og:description", content: "Forest Hills and Vadrósza." },
      { property: "og:image", content: hillside },
    ],
  }),
  component: CoursesPage,
});

const courses = [
  {
    slug: "forest-hills",
    title: "Forest Hills",
    eyebrow: "The Championship Course",
    stats: "18 Tees · 9 Greens · Par 70",
    image: hillside,
    blurb:
      "Eighteen distinct tee boxes converge upon nine sculpted greens — a routing in the great tradition of double-tee design, where every green is played from two angles, and no round is ever the same.",
  },
  {
    slug: "vadrosza",
    title: "Vadrósza",
    eyebrow: "The Short Course",
    stats: "9 Holes · Par 33",
    image: lakeside,
    blurb:
      "Named for the wild rose that blooms across the Balaton Uplands. Nine elegant holes threading meadow and woodland — a place to sharpen the short game, or simply walk the land at golden hour.",
  },
];

function CoursesPage() {
  return (
    <>
      <Header />
      <main className="pt-32">
        <section className="container-prose text-center pb-20">
          <span className="eyebrow">The Courses</span>
          <h1 className="mt-6 font-display text-5xl md:text-7xl">Two Courses, One Estate</h1>
          <div className="mt-8 flex justify-center"><span className="gold-rule" /></div>
          <p className="mt-8 max-w-2xl mx-auto text-lg text-muted-foreground">
            Each course at Balaton Hills was conceived as a singular expression
            of its landscape — sister tracks of distinct character, united by an
            uncompromising pursuit of championship craft.
          </p>
        </section>

        {courses.map((c, i) => (
          <section key={c.slug} className={i % 2 ? "bg-secondary/40 py-24" : "py-24"}>
            <div className="container-prose grid lg:grid-cols-2 gap-12 items-center">
              <div className={i % 2 ? "lg:order-2" : ""}>
                <img src={c.image} alt={c.title} className="w-full aspect-[4/3] object-cover" loading="lazy" />
              </div>
              <div>
                <span className="eyebrow">{c.eyebrow}</span>
                <h2 className="mt-4 font-display text-4xl md:text-5xl">{c.title}</h2>
                <div className="mt-3 text-sm tracking-[0.25em] uppercase text-muted-foreground">{c.stats}</div>
                <p className="mt-6 text-lg text-muted-foreground leading-relaxed">{c.blurb}</p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link to="/booking" className="bg-primary text-primary-foreground px-6 py-3 text-xs tracking-[0.25em] uppercase">
                    Book this Course
                  </Link>
                  <span className="inline-flex items-center px-6 py-3 text-xs tracking-[0.25em] uppercase text-muted-foreground border border-border">
                    Hole-by-hole · Coming soon
                  </span>
                </div>
              </div>
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
