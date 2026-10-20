# Henrique Brain — notes for agents working in this repo

Personal multimodal creative memory. Product rule: **never save a reference without understanding it**. The original file is raw material; the extracted knowledge (semantic file + embeddings + relations) is the product.

## Layout
- `src/app` — Next.js 15 App Router. Pages are server components reading `src/server/*` directly; `/api/*` routes are the external contract (also used by the browser via `src/lib/api.ts`).
- `src/server/pipeline/ingest.ts` — the pipeline. Steps map to `PROCESSING_STEPS` in `taxonomy.ts`. Failures set `status=failed` with `error`; partial data is kept.
- `src/server/ai` — model-agnostic router. Add a provider by implementing `LLMProvider` / `EmbeddingProvider` / `TranscriptionProvider` in `providers/` and wiring it in `router.ts`. Structured outputs are zod schemas in `schemas.ts`; every field required, nullable where empty.
- `src/server/connectors` — one connector per platform, within public APIs/terms. Return URL + metadata + thumbnail even when media cannot be fetched. `web.ts` is the catch-all.
- `src/server/search` — hybrid search with RRF over Postgres FTS + four pgvector columns.
- `src/server/db/schema.ts` — Drizzle schema. `EMBEDDING_DIMENSIONS` is baked into the migration.
- `galia-win/` — a separate Next.js app (party landing page, Pix ticket requests, admin panel) with its own `package.json`, lockfile, tests and `CLAUDE.md`. It is excluded from this app's `tsconfig` and Tailwind sources, and none of the Brain conventions below (Apple HIG, i18n) apply to it.

## Thumbnails
The thumbnail is always the material's own, never generated: the OpenGraph or oEmbed image for a link, a frame for video, the file itself for an image, and the rendered first page for a PDF (`renderPdfFirstPage` in `pipeline/pdf.ts`, via the optional `@napi-rs/canvas`). Do not synthesise an image to stand in for a reference. When the material carries none, a text idea or an Instagram login wall, fall back to type in `components/thumb.tsx` rather than to invented imagery.

## Base path
`BASE_PATH` (e.g. `/brain`) serves the app from a sub path. Next prefixes `<Link>`, `router.push`, route handlers and `public/` automatically. It does NOT prefix strings you build yourself, and `redirect()` from `next/navigation` DOES prefix — so use `withBase()` from `src/lib/base-path.ts` for `fetch`, `Response.redirect`, `new URL`, plain `<a href>` and manifest paths, and never for `<Link>` or `redirect()`. Verified both ways in `tests/share.test.ts` and by building at root and at `/brain`.

## Conventions
- Code, identifiers and comments in English. The UI is bilingual: never inline user-facing text in a component, put it in `src/lib/i18n.ts` and read it with `dict()` on the server or `useT()` on the client. `pt` is the source of truth and `en` is typed against it, so a missing key fails the typecheck.
- Controlled vocabularies stay in English in the database and in prompts; only their labels are translated, via `taxonomyLabel()`. That keeps existing rows valid and the model's output stable across a language switch.
- The reader's language lives in the `brain_lang` cookie so server components can read it. What the *model writes* when understanding a reference is `BRAIN_CONTENT_LANGUAGE` instead, because it is written once at capture time.
- Keep the UI a creation tool, not a dashboard: whitespace, clean type, masonry, minimal chrome.
- Anthropic calls go through `@anthropic-ai/sdk` (`messages.parse` + `zodOutputFormat`, native image/PDF blocks). Default model `claude-opus-5`.
- Run `npm run typecheck && npm test` before committing. `npm run build` must stay green.
- Never commit `.env`. Local dev without keys: `LLM_PROVIDER=mock EMBEDDING_PROVIDER=mock`.

## Design: Apple HIG
The UI follows Apple's Human Interface Guidelines; `src/app/globals.css` is the whole system.
- Colors are Apple semantic colors as tokens, light and dark: `ink` label, `ink-2` secondaryLabel, `ink-3` systemGray, `paper` systemBackground, `paper-2` secondarySystemBackground, `surface` cards, `line` separators, `fill`/`fill-2` for fields and gray buttons, `accent` systemBlue, `danger` systemRed, `success` systemGreen. Never a raw Tailwind palette color (`red-600`, `zinc-200`) or a hex in a component; the one exception is canvas drawing (`knowledge-graph.tsx`), which cannot read CSS variables and uses Apple system color values directly.
- Type uses the iOS text styles: `large-title` for page titles, `title-2`/`title-3`/`headline` below it, `.eyebrow` for section headers. Sentence case everywhere; no uppercase tracked labels, no manual `tracking-*` (SF tracks itself).
- Buttons: `btn-filled` for the one primary action on a screen, `btn-gray` for everything else, systemRed for destructive. Touch targets are 44pt below `lg` (`h-11 lg:h-9`).
- Fields are fills (`bg-fill`, radius 10), not outlines. Containers are fills (`bg-paper-2`) or elevated cards (`bg-surface` + `--card-shadow`), not bordered boxes. Bars and menus use the `material` utility.
- Long-form reading text is `ink`; `ink-2` is for supporting text only.
- Reduce Motion and Increase Contrast are honoured in `globals.css`; keep new animation behind them.
