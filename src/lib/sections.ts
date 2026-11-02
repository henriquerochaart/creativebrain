/**
 * Where everything lives now that the app has no header or drawer on a phone. The tab bar carries
 * Home, Search, Add, Collections and Settings; every other screen is reached from one of them, so
 * the tab that leads to a screen stays selected while it is open, and the screen shows a back link
 * to it. Saved is a collection, so it hangs off Collections. The rest of the app's tools hang off
 * Settings, as rows above the settings themselves.
 */

export type HubKey = "inbox" | "discover" | "think" | "assistant" | "moodboards" | "projects" | "graph" | "patterns";

/** The rows at the top of Settings, in order. `icon` is a Thiings slug in public/icons/3d. */
export const SETTINGS_HUB: { href: string; key: HubKey; icon: string }[] = [
  { href: "/inbox", key: "inbox", icon: "mailbox" },
  { href: "/discover", key: "discover", icon: "binoculars" },
  { href: "/think", key: "think", icon: "light-bulb" },
  { href: "/assist", key: "assistant", icon: "genies-lamp" },
  { href: "/moodboards", key: "moodboards", icon: "cork-board" },
  { href: "/projects", key: "projects", icon: "blueprint" },
  { href: "/graph", key: "graph", icon: "molecule" },
  { href: "/patterns", key: "patterns", icon: "kaleidoscope" },
];

/** Screens under Collections besides its own routes. */
export const COLLECTIONS_HUB = ["/saved"];

/** Screens under Início: the full Recentes gallery behind its heading. */
export const HOME_HUB = ["/recent"];

/** True when `path` is `href` or below it. */
export function within(path: string, href: string): boolean {
  return path === href || path.startsWith(`${href}/`);
}

/** The tab a path belongs to, for the tab bar's selection and the back link. */
export function tabOf(path: string): "home" | "search" | "collections" | "settings" | null {
  if (path === "/" || HOME_HUB.includes(path)) return "home";
  if (within(path, "/search")) return "search";
  if (within(path, "/collections") || COLLECTIONS_HUB.some((h) => within(path, h))) return "collections";
  if (within(path, "/settings") || SETTINGS_HUB.some((h) => within(path, h.href))) return "settings";
  return null;
}

/**
 * Where a screen's back link goes, or null for a tab's own root and for screens that carry their
 * own back link (a moodboard or a project goes back to its list, not to Settings).
 */
export function parentOf(path: string): "/" | "/settings" | "/collections" | null {
  if (HOME_HUB.includes(path)) return "/";
  if (SETTINGS_HUB.some((h) => path === h.href)) return "/settings";
  if (COLLECTIONS_HUB.includes(path) || /^\/collections\/[^/]+$/.test(path)) return "/collections";
  return null;
}
