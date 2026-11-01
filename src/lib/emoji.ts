/**
 * The emoji that stand for kinds of things in the library: media types, platforms, subjects. They
 * are icons, not imagery of a reference — a reference's picture is always its own (see thumb.tsx).
 * Keys are the controlled vocabularies in taxonomy.ts, which stay in English.
 */
export const TYPE_EMOJI: Record<string, string> = {
  video: "🎬",
  image: "🖼️",
  website: "🌐",
  pdf: "📄",
  text: "💡",
  audio: "🎧",
};

export const PLATFORM_EMOJI: Record<string, string> = {
  instagram: "📸",
  tiktok: "🎵",
  youtube: "📺",
  behance: "🎨",
  pinterest: "📌",
};

export const SUBJECT_EMOJI: Record<string, string> = {
  Advertising: "📣",
  Branding: "🏷️",
  Design: "🎨",
  Technology: "💻",
  AI: "🤖",
  Apps: "📱",
  Websites: "🌐",
  UX: "🧭",
  Social: "💬",
  Content: "✍️",
  Copywriting: "🖋️",
  Film: "🎞️",
  Photography: "📷",
  Fashion: "👗",
  Culture: "🎭",
  Music: "🎶",
  Architecture: "🏛️",
  Business: "💼",
};

/** Display order of the quick filters: what people save most from first. */
export const TYPE_ORDER = ["video", "image", "website", "pdf", "text", "audio"] as const;
export const PLATFORM_ORDER = ["instagram", "tiktok", "youtube", "behance", "pinterest"] as const;

/**
 * Where Apple's artwork for an emoji lives: the emoji-datasource-apple package on jsDelivr, pinned.
 * File names are the fully-qualified code points (🖼️ is 1f5bc-fe0f) while a typed emoji may lack
 * the FE0F selector, so this returns every plausible name, best guess first.
 */
const BASE = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/";

export function emojiCandidates(char: string): string[] {
  const cps = Array.from(char.trim()).map((c) => c.codePointAt(0)!.toString(16));
  if (!cps.length) return [];
  const given = cps.join("-");
  const without = cps.filter((c) => c !== "fe0f").join("-");
  // A single symbol typed without its presentation selector: the file has it.
  const withSelector = cps.includes("fe0f") ? without : [cps[0], "fe0f", ...cps.slice(1)].join("-");
  return [...new Set([given, withSelector, without])].map((name) => `${BASE}${name}.png`);
}

