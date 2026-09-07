import { BASE_PATH, withBase } from "@/lib/base-path";

export const runtime = "nodejs";
export const dynamic = "force-static";

/**
 * The manifest is generated rather than static because every path inside it — start_url, scope,
 * icons and the share_target action — has to carry the base path when the app is served from
 * a sub path of a domain.
 */
export function GET() {
  const manifest = {
    name: "Henrique Brain",
    short_name: "Brain",
    description: "Never save a reference without understanding it.",
    id: withBase("/"),
    start_url: withBase("/"),
    scope: withBase("/") || "/",
    display: "standalone",
    background_color: "#fbfbfa",
    theme_color: "#111111",
    icons: [
      { src: withBase("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: withBase("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
      { src: withBase("/icons/maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Android's share sheet posts here; /share captures and opens the reference.
    share_target: {
      action: withBase("/share"),
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: { title: "title", text: "text", url: "url" },
    },
    shortcuts: [
      { name: "Think", url: withBase("/think"), description: "Ask the brain" },
      { name: "Inbox", url: withBase("/inbox"), description: "What is being understood" },
    ],
  };
  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600", "x-base-path": BASE_PATH || "/" },
  });
}
