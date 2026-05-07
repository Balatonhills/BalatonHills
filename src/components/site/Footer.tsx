import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-24">
      <div className="container-prose py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Balaton Hills Golf Club"
              className="h-16 w-auto brightness-0 invert"
            />
          </div>
          <p className="mt-6 max-w-md text-sm text-primary-foreground/70 leading-relaxed">
            Two championship courses set between the rolling vineyards of the Balaton Uplands and
            the silver waters of Hungary's largest lake.
          </p>
        </div>

        <div>
          <h4 className="text-xs tracking-[0.25em] uppercase text-gold mb-4">Visit</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>
              <Link to="/courses">Our Courses</Link>
            </li>
            <li>
              <Link to="/membership">Membership</Link>
            </li>
            <li>
              <Link to="/booking">Book a Tee Time</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs tracking-[0.25em] uppercase text-gold mb-4">Contact</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>Balatonfüred, Hungary</li>
            <li>+36 1 000 0000</li>
            <li>welcome@balatonhills.hu</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="container-prose py-6 text-xs text-primary-foreground/60 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Balaton Hills Golf Club</span>
          <span className="tracking-widest uppercase">Established in the spirit of tradition</span>
        </div>
      </div>
    </footer>
  );
}
