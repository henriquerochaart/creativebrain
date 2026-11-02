import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { env } from "@/server/env";
import { publicOrigin } from "@/server/origin";
import { currentUser } from "@/server/accounts";
import { captureToken } from "@/lib/session";
import { logout } from "@/app/(auth)/actions";
import { statusCounts } from "@/server/references";
import { SETTINGS_HUB } from "@/lib/sections";
import { cn } from "@/lib/utils";
import type { Dict } from "@/lib/i18n";
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
    <section id={id} className="scroll-mt-6 rounded-[22px] bg-paper-2 p-5">
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
 * The app's other screens, as an iOS Settings list: one rounded group, a 3D icon, the name, a
 * count where one helps, a chevron. A phone reaches them only from here (see `lib/sections.ts`).
 */
function Hub({ d, inbox, failed }: { d: Dict; inbox: number; failed: number }) {
  return (
    <nav className="overflow-hidden rounded-[22px] bg-paper-2">
      {SETTINGS_HUB.map((h, i) => (
        <Link key={h.href} href={h.href} className="group flex min-h-14 items-center gap-3 pl-4 transition-colors hover:bg-fill active:bg-fill">
          <Thing name={h.icon} className="h-9 w-9" />
          <span className={cn("flex min-h-14 flex-1 items-center gap-2 pr-3", i > 0 && "border-t border-line")}>
            <span className="flex-1 text-[17px] text-ink">{d.nav[h.key]}</span>
            {h.key === "inbox" && inbox > 0 && (
              <span className={cn("tabular-nums text-[15px]", failed > 0 ? "grid h-[22px] min-w-[22px] place-items-center rounded-full bg-danger px-1.5 text-[13px] font-semibold text-white" : "text-ink-3")}>{inbox}</span>
            )}
            <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
          </span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * Settings, which on a phone is also where the rest of the app lives: first the screens that are
 * not tabs (Inbox, Discover, the thinking tools), then the reader's language, putting the Brain on
 * a phone (Home Screen app, the Brain shortcut, Android, the desktop bookmarklet), connecting
 * agents over MCP, and maintenance.
 */
export default async function SettingsPage() {
  const { lang, d } = await dict();
  const s = d.settings;
  const counts = await statusCounts().catch(() => ({}) as Record<string, number>);
  const failed = counts.failed ?? 0;
  const inbox = (counts.queued ?? 0) + (counts.processing ?? 0) + failed;
  const origin = await publicOrigin();
  // Everything here is copied into a phone or a config file, so it must be the full public root.
  const root = `${origin}${env.basePath}`;
  const apiKeySet = Boolean(env.apiKey);
  // A Shortcut cannot sign in: its URL carries the capture token, and, since it sends no language
  // cookie, a non-default reader language too.
  const captureUrl = `${root}/api/capture?reply=text&token=${await captureToken()}${lang === DEFAULT_LANG ? "" : `&lang=${lang}`}`;
  const shortcutUrl = /^https:\/\//.test(env.shortcutUrl) ? env.shortcutUrl : null;
  const st = s.steps;
  const steps = [st.create, st.share, st.fetch, st.options, st.notify];
  const user = await currentUser();
  const mcpConfig = JSON.stringify(
    { mcpServers: { brain: { command: "npx", args: ["tsx", "src/mcp/server.ts"], env: { BRAIN_URL: root, ...(apiKeySet ? { BRAIN_API_KEY: "…" } : {}) } } } },
    null,
    2,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="large-title mb-6">{s.title}</h1>

      {user && (
        <Group
          icon="key"
          title={user.email}
          aside={
            <form action={logout}>
              <button type="submit" className="btn-gray h-11 px-4 text-[15px] text-danger lg:h-9">
                {d.auth.logout}
              </button>
            </form>
          }
        />
      )}

      <Hub d={d} inbox={inbox} failed={failed} />

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
        {shortcutUrl && (
          // The Albo way: an iCloud link to the finished shortcut opens Shortcuts on "Add Shortcut".
          <a href={shortcutUrl} className="btn-filled h-12 w-full text-[17px]">
            {s.shortcutInstall}
          </a>
        )}
        <details className={shortcutUrl ? "mt-4" : undefined} open={!shortcutUrl}>
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
            // How to use it is a tooltip: drag it to the bookmarks bar.
            title={s.desktopSub}
            className="btn-filled h-11 px-4 text-[15px] lg:h-10 lg:text-sm"
          >
            + Brain
          </a>
        </div>
      </Group>

      <Group icon="plug-adapter" title={s.mcp}>
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
