import { fetchWithTimeout } from "./types";

export type OEmbed = {
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
};

export async function fetchOEmbed(endpoint: string): Promise<OEmbed | null> {
  try {
    const res = await fetchWithTimeout(endpoint, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as OEmbed;
  } catch {
    return null;
  }
}
