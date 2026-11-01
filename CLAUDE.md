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

## Design: Apple HIG
The UI follows Apple's Human Interface Guidelines; `src/app/globals.css` is the whole system.
- Colors are Apple semantic colors as tokens, light and dark: `ink` label, `ink-2` secondaryLabel, `ink-3` systemGray, `paper` systemBackground, `paper-2` secondarySystemBackground, `surface` cards, `line` separators, `fill`/`fill-2` for fields and gray buttons, `accent` systemBlue, `danger` systemRed, `success` systemGreen, `warning` systemOrange. Never a raw Tailwind palette color (`red-600`, `zinc-200`) or a hex in a component; the one exception is canvas drawing (`knowledge-graph.tsx`), which cannot read CSS variables and uses Apple system color values directly.
- Type uses the iOS text styles: `large-title` for page titles, `title-2`/`title-3`/`headline` below it, `.eyebrow` for section headers, all in San Francisco (the system font stack, `-apple-system` first). Sentence case everywhere; no uppercase tracked labels, no manual `tracking-*` (SF tracks itself).
- Buttons: `btn-filled` for the one primary action on a screen, `btn-gray` for everything else, systemRed for destructive. Touch targets are 44pt below `lg` (`h-11 lg:h-9`).
- Fields are fills (`bg-fill`, radius 10), not outlines. Containers are fills (`bg-paper-2`) or elevated cards (`bg-surface` + `--card-shadow`), not bordered boxes. Bars and menus use the `material` utility.
- Long-form reading text is `ink`; `ink-2` is for supporting text only.
- Reduce Motion and Increase Contrast are honoured in `globals.css`; keep new animation behind them.

## App feel (after Albo)
On top of HIG, the UI should feel like a friendly phone app, not a web dashboard.
- Below `lg`, a floating tab bar (`tab-bar.tsx`: Início, Buscar, +, Entrada, Coleções) carries navigation; `main` has `pb-32` to clear it. The header is the "Brain" wordmark and a menu button on the right that opens the sidebar drawer from the right. At `lg` the sidebar and toolbar take over and the tab bar is gone.
- Language, installing (Home Screen app, the Brain shortcut, Android, bookmarklet), MCP and maintenance live in `/settings`, not in the header. `/share/setup` redirects there.
- Capture starts in one place: the Add sheet (`add-sheet.tsx`), opened with `useAdd().open()` from the tab bar's +, the toolbar's Add button and the dashed + card. Never a + that navigates. `?add=1` still opens it. Results show as the provider's toast, which outlives the sheet.
- One typeface, San Francisco, for text and titles. Not SF Pro Rounded, not a web font: Henrique asked for plain SF after trying both.
- Kinds of things (media types, platforms, subjects) and the app's own actions are drawn with 3D icons from Thiings, self-hosted in `public/icons/3d` (256px WebP) and rendered with `<Thing name=…>`; the maps live in `src/lib/emoji.ts`. Thiings' free licence is personal, non-commercial use with visible attribution, carried at the foot of Settings; any commercial use of the Brain needs their paid licence. Emoji a person picks (collections) render as Apple's artwork via `<Emoji>`. Neither ever stands in for a reference's own picture (see Thumbnails).
- Cards have no shell: the picture rounded (`rounded-[22px]`), then the platform in `ink-3` and a bold title. Shape language: pills (`chip`), big radii, fills.
- The home page never shows a reference twice: the Recent row takes the newest, the grid starts after them.
- Sideways rows use `scroll-row`, bleed to the screen edge on a phone (`-mx-4 px-4`) and set matching `scroll-px-*`, or the snap swallows the padding.

## Economy of language
Every word and component has to earn its place. Before shipping UI, check: is anything repeated on the same screen? Could a title go? Does a description just restate its title? Can a text be shorter without losing meaning? Does a component exist without adding information, guidance or function? Is the UI explaining what should be obvious? If yes, cut it.
- One title per screen, no eyebrow above it that repeats the nav label, no subtitle that paraphrases it.
- No filler ("Aqui você pode…", "Tudo o que você precisa…"), no promotional adjectives. Short, direct sentences; buttons say what they do.
- Secondary detail behind progressive disclosure (`<details>`, tooltips), not on the page by default.
- Errors, confirmations and toasts are short and specific ("Salvo. Entendendo…", "Já estava salvo.").
- Never cut what a decision or an action needs: instructions, empty states, feedback, accessibility labels.

