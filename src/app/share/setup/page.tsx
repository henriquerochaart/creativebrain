import { headers } from "next/headers";
import { TriangleAlert } from "lucide-react";
import { env } from "@/server/env";
import { DEFAULT_LANG } from "@/lib/i18n";
import { InstallButton, CopyField } from "@/components/share-setup";
import { Emoji } from "@/components/emoji";
import { dict } from "@/server/lang";

/** Renders the **bold** spans the setup strings use for the names of buttons and actions. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 ? (
          <b key={i} className="font-semibold text-ink">
            {part}
          </b>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** One page that turns a phone into a capture device: Android via PWA share sheet, iPhone via a Shortcut. */
export default async function ShareSetupPage() {
  const { lang, d } = await dict();
  const s = d.share.setup;
  const h = await headers();
  const origin = env.appUrl.startsWith("http") && !env.appUrl.includes("localhost") ? env.appUrl : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"}`;
  // Everything shown on this page is copied into a phone, so it must be the full public root.
  const root = `${origin}${env.basePath}`;
  const apiKeySet = Boolean(env.apiKey);
  // The Shortcut posts here and shows the plain-text reply as its notification. It carries no
  // language cookie, so a non-default reader language goes into the URL itself.
  const captureUrl = `${root}/api/capture?reply=text${lang === DEFAULT_LANG ? "" : `&lang=${lang}`}`;
  const st = s.iphoneSteps;
  const steps = [st.create, st.share, st.fetch, st.options, ...(apiKeySet ? [st.key] : []), st.notify];
  const shortcutUrl = /^https:\/\//.test(env.shortcutUrl) ? env.shortcutUrl : null;
  const manualSteps = (
    <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fill text-[12px] font-semibold text-ink">{i + 1}</span>
          <span className="min-w-0">
            <Rich text={step} />
            {step === st.fetch && <CopyField value={captureUrl} />}
          </span>
        </li>
      ))}
    </ol>
  );
  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <header>
        <p className="eyebrow">{d.share.eyebrow}</p>
        <h1 className="large-title mt-1">{s.title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">{s.intro}</p>
      </header>

      <section className="rounded-[20px] bg-paper-2 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="title-3">{s.android}</h2>
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

      <section className="rounded-[20px] bg-paper-2 p-6">
        <h2 className="title-3">{s.iphone}</h2>
        {shortcutUrl ? (
          // The Albo way: an iCloud link to the finished shortcut. Shortcuts opens it on its "Add
          // Shortcut" screen, so installing is one tap, on any iPhone, with nothing to type.
          <>
            <div className="mt-4 flex items-center gap-4 rounded-[20px] bg-surface p-4 shadow-[var(--card-shadow)]">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[14px] bg-accent text-[30px] leading-none">
                <Emoji char="🧠" />
              </span>
              <div className="min-w-0">
                <p className="headline">{s.shortcutName}</p>
                <p className="mt-0.5 text-[13px] leading-[18px] text-ink-2">{s.shortcutSub}</p>
              </div>
            </div>
            <a href={shortcutUrl} className="btn-filled mt-4 h-12 w-full text-[17px]">
              {s.shortcutInstall}
            </a>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-2">{s.iphoneSub}</p>
        )}
        {!apiKeySet && (
          <p className="mt-4 flex gap-2.5 rounded-2xl bg-warning/15 p-3 text-[13px] leading-relaxed text-ink">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <span>{s.noKeyWarning}</span>
          </p>
        )}

        <h3 className="headline mt-8">{s.instantTitle}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.instantSub}</p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-2">
          {s.instantWays.map((way, i) => (
            <li key={i}>
              <Rich text={way} />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{s.firstRun}</p>

        {shortcutUrl ? (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-ink-2">{s.manual}</summary>
            {manualSteps}
          </details>
        ) : (
          <>
            <h3 className="headline mt-8">{s.manual}</h3>
            {manualSteps}
            <p className="mt-5 rounded-2xl bg-fill p-3 text-[13px] leading-relaxed text-ink">
              <Rich text={s.shareLinkHint} />
            </p>
          </>
        )}

        <details className="mt-5">
          <summary className="cursor-pointer text-sm text-ink-2">{s.simplerVariant}</summary>
          <p className="mt-2 text-sm text-ink-2">
            <b>URL</b> <span className="font-mono text-ink">{root}/share?url=</span> + <b>Shortcut Input</b> → <b>Open URLs</b>
          </p>
        </details>
      </section>

      <section className="rounded-[20px] bg-paper-2 p-6">
        <h2 className="title-3">{s.desktop}</h2>
        <p className="mt-1 text-sm text-ink-2">{s.desktopSub}</p>
        <a
          href={`javascript:void(window.open('${root}/share?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank'))`}
          className="btn-filled mt-4 h-11 px-4 text-[15px] lg:h-10 lg:text-sm"
        >
          + Brain
        </a>
      </section>

      <p className="text-[12px] text-ink-3">{s.footer}</p>
    </div>
  );
}
