import { headers } from "next/headers";
import { TriangleAlert } from "lucide-react";
import { env } from "@/server/env";
import { InstallButton, CopyField, CopyBlock } from "@/components/share-setup";
import { LangSwitch } from "@/components/lang-switch";
import { ReprocessLinks } from "@/components/reprocess-links";
import { ReprocessVideos } from "@/components/reprocess-videos";
import { Thing } from "@/components/thing";
import { DEFAULT_LANG } from "@/lib/i18n";
import { dict } from "@/server/lang";

/** Renders the **bold** spans the settings strings use for the names of buttons and menus. */
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

/** One group: a 3D icon, a title, and what belongs to it. `aside` sits on the title row (a control). */
function Group({ id, icon, title, aside, children }: { id?: string; icon: string; title: string; aside?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[22px] bg-paper-2 p-5">
      <div className="flex items-center gap-3">
        <Thing name={icon} className="h-10 w-10" />
        <h2 className="headline flex-1">{title}</h2>
        {aside}
      </div>
      {children ? <div className="mt-4 text-[15px] leading-relaxed text-ink-2">{children}</div> : null}
    </section>
  );
}

/**
 * Settings: the reader's language, putting the Brain on a phone (Home Screen app, the Brain
 * shortcut, Android, the desktop bookmarklet), connecting agents over MCP, and maintenance.
 */
export default async function SettingsPage() {
  const { lang, d } = await dict();
  const s = d.settings;
  const h = await headers();
  const origin = env.appUrl.startsWith("http") && !env.appUrl.includes("localhost") ? env.appUrl : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"}`;
  // Everything here is copied into a phone or a config file, so it must be the full public root.
  const root = `${origin}${env.basePath}`;
  const apiKeySet = Boolean(env.apiKey);
  // A Shortcut sends no language cookie, so a non-default reader language goes into the URL itself.
  const captureUrl = `${root}/api/capture?reply=text${lang === DEFAULT_LANG ? "" : `&lang=${lang}`}`;
  const shortcutUrl = /^https:\/\//.test(env.shortcutUrl) ? env.shortcutUrl : null;
  const st = s.steps;
  const steps = [st.create, st.share, st.fetch, st.options, ...(apiKeySet ? [st.key] : []), st.notify];
  const mcpConfig = JSON.stringify(
    { mcpServers: { brain: { command: "npx", args: ["tsx", "src/mcp/server.ts"], env: { BRAIN_URL: root, ...(apiKeySet ? { BRAIN_API_KEY: "…" } : {}) } } } },
    null,
    2,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="large-title mb-6">{s.title}</h1>

      <Group icon="globe" title={s.language} aside={<LangSwitch />} />

      <Group id="instalar" icon="smartphone" title={s.app}>
        <p>
          <Rich text={s.appIphone} />
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span>
            <Rich text={s.appAndroid} />
          </span>
          <InstallButton />
        </div>
      </Group>

      <Group icon="lightning-bolt" title={s.shortcut}>
        <p>
          <Rich text={s.shortcutSub} />
        </p>
        {shortcutUrl && (
          // The Albo way: an iCloud link to the finished shortcut opens Shortcuts on "Add Shortcut".
          <a href={shortcutUrl} className="btn-filled mt-4 h-12 w-full text-[17px]">
            {s.shortcutInstall}
          </a>
        )}
        <details className="mt-4" open={!shortcutUrl}>
          <summary className="cursor-pointer font-medium text-ink">{s.manual}</summary>
          <ol className="mt-3 space-y-3">
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
          <p className="mt-3 text-[13px]">{s.firstRun}</p>
          {!shortcutUrl && (
            <p className="mt-3 text-[13px]">
              <Rich text={s.shareLinkHint} />
            </p>
          )}
        </details>
        <details className="mt-3">
          <summary className="cursor-pointer font-medium text-ink">{s.trigger}</summary>
          <p className="mt-2">{s.triggerSub}</p>
          <ul className="mt-1 space-y-1">
            {s.triggerWays.map((way, i) => (
              <li key={i}>
                <Rich text={way} />
              </li>
            ))}
          </ul>
        </details>
      </Group>

      <Group icon="laptop" title={s.desktop}>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`javascript:void(window.open('${root}/share?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank'))`}
            className="btn-filled h-11 px-4 text-[15px] lg:h-10 lg:text-sm"
          >
            + Brain
          </a>
          <span>{s.desktopSub}</span>
        </div>
      </Group>

      <Group icon="plug-adapter" title={s.mcp}>
        <p>{s.mcpSub}</p>
        <CopyBlock value={mcpConfig} />
        {!apiKeySet && (
          <p className="mt-3 flex gap-2 text-[13px] text-ink">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            {s.noKey}
          </p>
        )}
      </Group>

      <Group icon="gear" title={s.maintenance}>
        <div className="flex flex-wrap gap-3">
          <ReprocessLinks />
          <ReprocessVideos />
        </div>
      </Group>

      <p className="pt-2 text-center text-[12px] text-ink-3">
        {s.credits}{" "}
        <a href="https://www.thiings.co" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
          Thiings
        </a>
      </p>
    </div>
  );
}
