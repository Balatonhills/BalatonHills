# Balaton Hills Golf Club

Marketing site for Balaton Hills Golf Club. Live at [www.balatonhills.com](https://www.balatonhills.com).

## Stack

- **TanStack Start** (^1.167) for SSR + file-based routing
- **React 19**, **Tailwind 4**, **TypeScript** (strict)
- **Vercel** for hosting via a custom adapter (see `api/ssr.mjs`)
- **Supabase** wired but unused — kept lazy so importing doesn't crash on missing env vars

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # client + SSR bundle → dist/
npm run lint         # eslint
npm run format       # prettier --write
npm test             # vitest smoke tests
```

Node `>=20` is required (see `engines` in `package.json`).

## Project layout

```
api/ssr.mjs            Vercel serverless function. Bridges Node Req/Res ↔ Web
                       Fetch and forwards to the TanStack Start server bundle.
public/                Copied verbatim to dist/client/ at build time
                       (favicon, robots.txt, sitemap.xml).
src/
├── routes/            File-based routes; __root.tsx provides the layout shell
│                      (Header + Outlet + Footer).
├── components/site/   Header & Footer.
├── lib/               error-capture, error-page, supabase (lazy).
├── assets/            Source images (Vite imports → fingerprinted output).
├── start.ts           TanStack Start instance + request middleware.
├── router.tsx         Router factory.
├── server.ts          (deleted) — was the Cloudflare entry; Vercel adapter
                       lives in api/ssr.mjs now.
└── styles.css         Tailwind 4 + design tokens (oklch).
vercel.json            outputDirectory + rewrite ALL → /api/ssr.
vite.config.ts         tanstackStart + tailwindcss + tsconfig-paths.
```

## Deployment

GitHub `main` is connected to Vercel. Every push triggers a production deploy:

```bash
git push origin main
```

The Vercel project is `balaton-hills-golf-experience` on the `vikingurgods-projects` team.

## Environment variables

Set on Vercel under **Project → Settings → Environment Variables**, and locally in `.env.local`. See `.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Currently nothing imports the Supabase client — the env vars only matter once a feature starts calling `getSupabase()` from `src/lib/supabase.ts`.

## Notes

- The Vercel adapter (`api/ssr.mjs`) hand-rolls the Node→Fetch bridge because TanStack Start `^1.167` doesn't ship a Vercel preset. It guards a 5 MB body cap, appends Set-Cookie correctly, and destroys the response on mid-stream errors.
- The Header runs scroll-based styling on `/` only; on every other route it stays solid because there's no hero video to overlay (see `src/components/site/Header.tsx`).
- Booking widget is from Golfigo (`api.golfigo.com`). It's loaded client-side only with a 10 s timeout fallback that surfaces the club's phone/email if the third-party script doesn't respond.
