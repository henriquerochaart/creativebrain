import { headers } from "next/headers";
import { env } from "@/server/env";
import { InstallButton, CopyField } from "@/components/share-setup";
import { dict } from "@/server/lang";

/** One page that turns a phone into a capture device: Android via PWA share sheet, iPhone via a Shortcut. */
export default async function ShareSetupPage() {
  const { d } = await dict();
  const s = d.share.setup;
  const h = await headers();
  const origin = env.appUrl.startsWith("http") && !env.appUrl.includes("localhost") ? env.appUrl : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"}`;
  // Everything shown on this page is copied into a phone, so it must be the full public root.
  const root = `${origin}${env.basePath}`;
  const apiKeySet = Boolean(env.apiKey);
  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <header>
        <p className="eyebrow">{d.share.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.intro}</p>
      </header>

      <section className="rounded-3xl border border-line p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{s.android}</h2>
            <p className="mt-1 text-sm text-ink-2">{s.androidSub}</p>
          </div>
          <InstallButton />
        </div>
        <ol className="mt-5 space-y-2 text-sm text-ink-2">
          {s.androidSteps.map((step, i) => (
            <li key={i}>{typeof step === "function" ? step(root) : step}</li>
          ))}
        </ol>
      </section>

      <section className="rounded-3xl border border-line p-6">
        <h2 className="text-lg font-semibold tracking-tight">{s.iphone}</h2>
        <p className="mt-1 text-sm text-ink-2">{s.iphoneSub}</p>
        {!apiKeySet && (
          <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-[13px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{s.noKeyWarning}</p>
        )}
        <ol className="mt-5 space-y-3 text-sm text-ink-2">
          <li>1. Shortcuts → <b>+</b> → Brain.</li>
          <li>
            2. <b>ⓘ</b> → <b>Show in Share Sheet</b> → Share Sheet Types: <b>URLs</b>, <b>Text</b>.
          </li>
          <li>
            3. <b>Get Contents of URL</b>
            <CopyField value={`${root}/api/references`} />
          </li>
          <li>
            4. Method <b>POST</b> · Headers <span className="font-mono text-ink">Content-Type: application/json</span>
            {apiKeySet ? (
              <>
                {" "}· <span className="font-mono text-ink">Authorization: Bearer &lt;BRAIN_API_KEY&gt;</span>
              </>
            ) : null}{" "}
            · Request Body <b>JSON</b>: <span className="font-mono text-ink">input</span> = <b>Shortcut Input</b>
          </li>
          <li>5. <b>Show Notification</b> → ✓</li>
        </ol>
        <details className="mt-5">
          <summary className="cursor-pointer text-sm text-ink-2">{s.simplerVariant}</summary>
          <p className="mt-2 text-sm text-ink-2">
            <b>URL</b> <span className="font-mono text-ink">{root}/share?url=</span> + <b>Shortcut Input</b> → <b>Open URLs</b>
          </p>
        </details>
      </section>

      <section className="rounded-3xl border border-line p-6">
        <h2 className="text-lg font-semibold tracking-tight">{s.desktop}</h2>
        <p className="mt-1 text-sm text-ink-2">{s.desktopSub}</p>
        <a
          href={`javascript:void(window.open('${root}/share?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank'))`}
          className="mt-4 inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper"
        >
          + Brain
        </a>
      </section>

      <p className="text-[12px] text-ink-3">{s.footer}</p>
    </div>
  );
}
