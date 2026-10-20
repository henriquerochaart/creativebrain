# Galhaween — notes for agents working in this directory

A standalone Next.js 15 app (own `package.json`, lockfile, tests) that lives inside the Henrique Brain repository. None of the Brain's conventions apply here: no Apple HIG, no i18n layer. The UI is Portuguese only, written inline.

## Layout
- `src/config/event.ts` — every public fact about the party. `null` renders as "em breve"; never fill a date, place or time nobody confirmed.
- `src/lib/pix.ts` — static Pix BR Code (EMV + CRC16). Tested byte for byte against the Banco Central example; keep that test.
- `src/server/db.ts` — Postgres via `pg` when `DATABASE_URL` is set, embedded PGlite otherwise. Refuses to start on Vercel without `DATABASE_URL`. Migrations are idempotent `create … if not exists`.
- `src/server/store.ts` — all SQL. State changes that must happen once (approve, check-in) are single conditional `update … returning` statements, not read-then-write.
- `src/server/mail.ts` — SMTP via nodemailer; ticket QR is a CID attachment.
- `src/app/api/*` — public `entries` (multipart upload), everything under `admin/` checks the session first.
- `public/logo.png`, `public/cartaz.{mp4,webm,jpg}`, `src/app/opengraph-image.jpg` — cut from the official poster video (1080×1350). The landing hero places logo and collage by their poster coordinates (`POSTER`, `LOGO_BOX`, `VIDEO_BOX` in `src/app/page.tsx`); re-cut and update those numbers together. Never replace the art with generated imagery.

## Rules
- Receipt types are sniffed from bytes (`sniffReceiptType`); never trust the browser's MIME and never add SVG or HTML.
- Only the request that issues a ticket sends the ticket e-mail; resending is explicit.
- Mobile first: design and check at 390 and 320 px wide before desktop; the primary action of each screen sits in the first viewport on a phone.
- Design follows the poster: photocopy-black paper (`public/textura.jpg`, a seamless tile), bone text, flat poster red for buttons, numerals, rules and four-point sparkles (`Sparkle`, `SparkleHeading`, `Divider`). Square corners (2px), thin rules, no gloss or gradients on surfaces. Black, red and bone are sampled from the poster; tokens live in `src/app/globals.css` `@theme`; use them, not raw hex, in components. Libre Caslon Condensed (the poster's footer face, self-hosted from `src/fonts`, OFL) for every capital: titles, labels, buttons; Libre Caslon Text for reading. Caps are tight (≤0.04em), never tracked out. Red text under 24px uses `blood-2` for contrast. Decorative CSS goes in `@layer components` so utilities can still override it, and every animation is switched off under `prefers-reduced-motion`.
- QR Codes are dark on light (`parchment`): scanners do not all read inverted codes.
- Run `npm run typecheck && npm test && npm run build` from this directory before committing.
