# Henrique Brain — notes for agents working in this repo

Personal multimodal creative memory. Product rule: **never save a reference without understanding it**. The original file is raw material; the extracted knowledge (semantic file + embeddings + relations) is the product.

## Layout
- `src/app` — Next.js 15 App Router. Pages are server components reading `src/server/*` directly; `/api/*` routes are the external contract (also used by the browser via `src/lib/api.ts`).
- `src/server/pipeline/ingest.ts` — the pipeline. Steps map to `PROCESSING_STEPS` in `taxonomy.ts`. Failures set `status=failed` with `error`; partial data is kept.
- `src/server/ai` — model-agnostic router. Add a provider by implementing `LLMProvider` / `EmbeddingProvider` / `TranscriptionProvider` in `providers/` and wiring it in `router.ts`. Structured outputs are zod schemas in `schemas.ts`; every field required, nullable where empty.
- `src/server/connectors` — one connector per platform, within public APIs/terms. Return URL + metadata + thumbnail even when media cannot be fetched. `web.ts` is the catch-all.
- `src/server/search` — hybrid search with RRF over Postgres FTS + four pgvector columns.
- `src/server/db/schema.ts` — Drizzle schema. `EMBEDDING_DIMENSIONS` is baked into the migration.

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
