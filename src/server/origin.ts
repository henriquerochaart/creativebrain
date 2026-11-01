import { headers } from "next/headers";
import { env } from "./env";

/**
 * The public origin, scheme and host without the base path: APP_URL when it names a real host,
 * otherwise the host the request came in on. Anything copied out of the app (a Shortcut URL, an
 * MCP config) or read by another service (a link preview's image) needs it absolute.
 */
export async function publicOrigin(): Promise<string> {
  if (env.appUrl.startsWith("http") && !env.appUrl.includes("localhost")) return env.appUrl;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"}`;
}
