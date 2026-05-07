import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";

const nav = [
  { to: "/courses", label: "Courses" },
  { to: "/about", label: "About" },
  { to: "/membership", label: "Membership" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  // On the home page we overlay the hero video, so the header stays transparent
  // until the user scrolls. Every other route has a light background, so the
  // header must always be solid or the white nav text becomes invisible.
  const solid = !isHome || scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid
          ? "bg-background/90 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container-prose flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logo}
            alt="Balaton Hills Golf Club"
            className={`h-14 w-auto transition-all ${solid ? "" : "brightness-0 invert"}`}
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "text-gold" }}
              className={`text-sm tracking-wider uppercase transition-colors hover:text-gold ${
                solid ? "text-foreground" : "text-background"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/booking"
            className="ml-2 inline-flex items-center justify-center bg-gold text-gold-foreground px-5 py-2.5 text-xs tracking-[0.2em] uppercase font-medium hover:bg-gold/90 transition-colors"
          >
            Book a Tee Time
          </Link>
        </nav>

        <button
          className={`lg:hidden p-2 ${solid ? "text-foreground" : "text-background"}`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-background border-t border-border">
          <div className="container-prose py-6 flex flex-col gap-4">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="text-sm tracking-wider uppercase text-foreground hover:text-gold"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/booking"
              onClick={() => setOpen(false)}
              className="bg-gold text-gold-foreground px-5 py-3 text-xs tracking-[0.2em] uppercase text-center"
            >
              Book a Tee Time
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
