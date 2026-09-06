import type { Connector, ConnectorResult } from "./types";
import { youtubeConnector } from "./youtube";
import { tiktokConnector } from "./tiktok";
import { instagramConnector } from "./instagram";
import { webConnector } from "./web";

export { detectPlatform, isProbablyUrl, normalizeUrl } from "./detect";
export type { ConnectorResult } from "./types";

/** Order matters: the first connector whose `matches` returns true wins; web is the catch-all. */
export const connectors: Connector[] = [youtubeConnector, tiktokConnector, instagramConnector, webConnector];

export function connectorFor(url: URL): Connector {
  return connectors.find((c) => c.matches(url)) ?? webConnector;
}

export async function resolveUrl(input: string): Promise<ConnectorResult> {
  const url = new URL(input);
  return connectorFor(url).fetch(url);
}
