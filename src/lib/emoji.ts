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
