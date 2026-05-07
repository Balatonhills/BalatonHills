## Rebrand to new Balaton Hills Golf Club logo

### New brand palette (from logo)
- **Primary navy**: deep navy blue from the logo waves/wordmark (~#1B2A4E)
- **Gold accent**: warm muted gold from the hills/"Balaton Hills" wordmark (~#C9A961)
- **Background**: clean white / very light cream (the logo sits on white)
- **Foreground text**: navy for headings, dark slate for body
- Drop the current heritage-green primary entirely — no green anywhere in the chrome.

### Files to change

1. **Replace `src/assets/logo.png`** with the uploaded logo (copy from `user-uploads://image-2.png`).

2. **`src/styles.css`** — rewrite the `:root` and `.dark` token blocks:
   - `--background`: near-white (oklch ~0.99)
   - `--primary`: navy (replaces green)
   - `--gold`: warmer, slightly more saturated gold to match the logo
   - `--accent`: lighter navy
   - `--secondary` / `--muted`: cool off-white / pale navy-tinted greys (replace warm cream tints)
   - `--ring`, `--border`: navy-tinted neutrals
   - Update `.dark` mirror tokens to navy base instead of green.

3. **`src/components/site/Header.tsx`** — the logo currently renders inside a `rounded-full` ring. The new logo is square with built-in wordmark; switch to a plain `h-12 w-auto` (no rounded ring), and consider hiding the adjacent text wordmark since the logo already includes "BALATON HILLS / GOLF CLUB". Keep the brand-name text only when scrolled-over-hero needs an accessible label, or drop it entirely.

4. **`src/components/site/Footer.tsx`** — same logo treatment (no rounded ring, larger natural-ratio render); remove the duplicate "Balaton Hills / Estate & Links" text block beside it, or keep just the "Estate & Links"-style tagline (note: rename tagline to "Golf Club" to match new logo). Footer background stays dark (now navy instead of green) and gold accents remain.

5. **Naming sweep** — current copy says "Balaton Hills Estate & Links" in several places (header tagline, footer, page `<title>`s, hero H1). Replace with "Balaton Hills Golf Club" to match the new logo lockup:
   - `src/routes/__root.tsx` default meta (currently still "Lovable App") → set to "Balaton Hills Golf Club"
   - `src/routes/index.tsx` head title + og tags
   - `src/routes/membership.tsx`, `about.tsx`, `booking.tsx`, `contact.tsx`, `courses.tsx` titles
   - Footer tagline + copyright line
   - Header tagline (if kept)

### Out of scope
- No layout changes, no new sections, no content rewrites beyond the "Estate & Links" → "Golf Club" rename.
- Course imagery stays as-is.

### Quick visual check after build
- Hero overlay still readable (navy gradient over video instead of green).
- Gold CTA buttons still have enough contrast on both white and navy backgrounds.
- Header logo crisp at 48px height on light and transparent-over-hero states.