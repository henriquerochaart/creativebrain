import { headers } from "next/headers";
import { env } from "@/server/env";
import { InstallButton, CopyField } from "@/components/share-setup";
import { withBase } from "@/lib/base-path";

/** One page that turns a phone into a capture device: Android via PWA share sheet, iPhone via a Shortcut. */
export default async function ShareSetupPage() {
  const h = await headers();
  const origin = env.appUrl.startsWith("http") && !env.appUrl.includes("localhost") ? env.appUrl : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"}`;
  // Everything shown on this page is copied into a phone, so it must be the full public root.
  const root = `${origin}${env.basePath}`;
  const apiKeySet = Boolean(env.apiKey);
  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <header>
        <p className="eyebrow">Share to Brain</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Save from any app in one tap</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Instagram does not expose your saved posts to any app. So the gesture changes: instead of tapping Save, tap Share and pick Brain. It works the same on TikTok, YouTube, Safari, Chrome, Behance and anything else with a share button.
        </p>
      </header>

      <section className="rounded-3xl border border-line p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Android</h2>
            <p className="mt-1 text-sm text-ink-2">Install the Brain as an app. It then appears in the system share sheet.</p>
          </div>
          <InstallButton />
        </div>
        <ol className="mt-5 space-y-2 text-sm text-ink-2">
          <li>1. Open <span className="font-mono text-ink">{root}</span> in Chrome on the phone.</li>
          <li>2. Tap the button above, or Chrome menu → <b>Add to Home screen</b> → <b>Install</b>.</li>
          <li>3. In Instagram, on any reel or post: Share → <b>Brain</b>. The reference opens while it is being understood.</li>
        </ol>
      </section>

      <section className="rounded-3xl border border-line p-6">
        <h2 className="text-lg font-semibold tracking-tight">iPhone</h2>
        <p className="mt-1 text-sm text-ink-2">iOS has no web share target, so a Shortcut does the job. Two minutes to build, once.</p>
        {!apiKeySet && (
          <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-[13px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            BRAIN_API_KEY is not set on this server, so the API is open. Set it before exposing the Brain to the internet, then paste the key in step 5.
          </p>
        )}
        <ol className="mt-5 space-y-3 text-sm text-ink-2">
          <li>1. Open <b>Shortcuts</b> → <b>+</b> → name it <b>Brain</b>.</li>
          <li>2. Tap the <b>ⓘ</b> icon → turn on <b>Show in Share Sheet</b> → Share Sheet Types: <b>URLs</b> and <b>Text</b>.</li>
          <li>3. Add action <b>Get Contents of URL</b>.</li>
          <li>
            4. Set URL to
            <CopyField value={`${root}/api/references`} />
          </li>
          <li>
            5. Expand the action: Method <b>POST</b>. Headers: <span className="font-mono text-ink">Content-Type</span> = <span className="font-mono text-ink">application/json</span>
            {apiKeySet ? (
              <>
                {" "}and <span className="font-mono text-ink">Authorization</span> = <span className="font-mono text-ink">Bearer &lt;your BRAIN_API_KEY&gt;</span>
              </>
            ) : null}
            . Request Body <b>JSON</b>: field <span className="font-mono text-ink">input</span> = <b>Shortcut Input</b>.
          </li>
          <li>6. Add action <b>Show Notification</b> with text “Captured”. Done.</li>
          <li>7. In Instagram: Share → <b>…</b> → <b>Brain</b>. The first time, iOS asks to allow the connection to {root}.</li>
        </ol>
        <details className="mt-5">
          <summary className="cursor-pointer text-sm text-ink-2">Simpler variant that opens the Brain in Safari</summary>
          <p className="mt-2 text-sm text-ink-2">
            Two actions only: <b>URL</b> set to <span className="font-mono text-ink">{root}/share?url=</span> followed by <b>Shortcut Input</b>, then <b>Open URLs</b>. It opens the reference page while the Brain understands it. No key needed if the UI is open.
          </p>
        </details>
      </section>

      <section className="rounded-3xl border border-line p-6">
        <h2 className="text-lg font-semibold tracking-tight">Desktop</h2>
        <p className="mt-1 text-sm text-ink-2">Drag this to your bookmarks bar. On any page, click it to send the URL to the Brain.</p>
        <a
          href={`javascript:void(window.open('${root}/share?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank'))`}
          className="mt-4 inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper"
          onDragStart={undefined}
        >
          + Brain
        </a>
      </section>

      <p className="text-[12px] text-ink-3">
        What arrives: the link, plus whatever text the app shared (Instagram sends the caption). The pipeline then does the rest: metadata, thumbnail, understanding, embeddings, connections.
      </p>
    </div>
  );
}
