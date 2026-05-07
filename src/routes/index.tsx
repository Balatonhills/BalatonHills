import { createFileRoute, Link } from "@tanstack/react-router";
import heroPoster from "@/assets/hero-poster.jpg";
import lakeside from "@/assets/course-lakeside.jpg";
import hillside from "@/assets/course-hillside.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Balaton Hills Golf Club — Premium Golf in Hungary" },
      {
        name: "description",
        content:
          "Two championship golf courses set between the vineyards of the Balaton Uplands and the silver waters of Lake Balaton.",
      },
      { property: "og:title", content: "Balaton Hills Golf Club" },
      { property: "og:description", content: "Premium golf at Lake Balaton, Hungary." },
      { property: "og:image", content: heroPoster },
    ],
  }),
  component: Index,
});

const HERO_VIDEO =
  "https://cdn.coverr.co/videos/coverr-aerial-view-of-a-golf-course-9020/1080p.mp4";

function Index() {
  return (
    <>
      <main>
        {/* Hero */}
        <section className="relative h-screen min-h-[640px] w-full overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={heroPoster}
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/20 to-primary/80" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center px-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/booking"
                className="inline-flex items-center justify-center bg-gold text-gold-foreground px-8 py-4 text-xs tracking-[0.25em] uppercase font-medium hover:bg-gold/90 transition-colors"
              >
                Book a Tee Time
              </Link>
              <Link
                to="/courses"
                className="inline-flex items-center justify-center border border-background/50 text-background px-8 py-4 text-xs tracking-[0.25em] uppercase font-medium hover:bg-background/10 transition-colors"
              >
                Discover the Courses
              </Link>
            </div>
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-background/70 text-[0.65rem] tracking-[0.3em] uppercase">
            Scroll
          </div>
        </section>

        {/* Courses */}
        <section className="py-24 bg-secondary/40">
          <div className="container-prose">
            <div className="text-center mb-16">
              <span className="eyebrow">Two Distinctive Courses</span>
              <h2 className="mt-4 font-display text-4xl md:text-5xl">Forest Hills & Vadrósza</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <CourseCard
                title="Forest Hills"
                subtitle="18 Tees · 9 Greens · Par 70"
                description="Our championship routing — eighteen tee boxes converging on nine sculpted greens, in the classic tradition of double-tee design."
                image={hillside}
              />
              <CourseCard
                title="Vadrósza"
                subtitle="9 Holes · Par 33"
                description="Nine elegant holes threading meadow and woodland — named for the wild rose of the Balaton Uplands."
                image={lakeside}
              />
            </div>
          </div>
        </section>

        {/* Booking CTA */}
        <section className="py-32 bg-primary text-primary-foreground text-center">
          <div className="container-prose">
            <span className="eyebrow">Reserve Your Round</span>
            <h2 className="mt-6 font-display text-4xl md:text-6xl text-background max-w-3xl mx-auto leading-tight">
              The course awaits. Choose your hour.
            </h2>
            <p className="mt-6 max-w-xl mx-auto text-primary-foreground/70">
              Tee times available daily from sunrise. Members and guests welcome.
            </p>
            <Link
              to="/booking"
              className="mt-10 inline-flex items-center justify-center bg-gold text-gold-foreground px-10 py-4 text-xs tracking-[0.25em] uppercase font-medium hover:bg-gold/90 transition-colors"
            >
              Open the Booking Desk
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

function CourseCard({
  title,
  subtitle,
  description,
  image,
}: {
  title: string;
  subtitle: string;
  description: string;
  image: string;
}) {
  return (
    <Link to="/courses" className="group block bg-card border border-border overflow-hidden">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-8">
        <div className="text-[0.65rem] tracking-[0.3em] uppercase text-gold">{subtitle}</div>
        <h3 className="mt-3 font-display text-3xl">{title}</h3>
        <p className="mt-3 text-muted-foreground leading-relaxed">{description}</p>
        <div className="mt-6 text-xs tracking-[0.25em] uppercase text-foreground group-hover:text-gold transition-colors">
          Explore the Course →
        </div>
      </div>
    </Link>
  );
}
