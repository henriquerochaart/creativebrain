/**
 * The three simultaneous classification systems plus creative principles.
 * A reference can live in many of these at once without duplicating the file.
 */
export const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "behance",
  "pinterest",
  "website",
  "pdf",
  "image",
  "video",
  "app",
  "text",
  "other",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const SUBJECTS = [
  "Advertising",
  "Branding",
  "Design",
  "Technology",
  "AI",
  "Apps",
  "Websites",
  "UX",
  "Social",
  "Content",
  "Copywriting",
  "Film",
  "Photography",
  "Fashion",
  "Culture",
  "Music",
  "Architecture",
  "Business",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const FORMATS = [
  "Campaign",
  "Film",
  "Activation",
  "Experience",
  "Website",
  "App",
  "Product",
  "Packaging",
  "Typography",
  "Identity",
  "Social Post",
  "OOH",
  "Installation",
  "Presentation",
  "Interface",
  "Case Study",
  "Article",
] as const;
export type Format = (typeof FORMATS)[number];

export const CREATIVE_PRINCIPLES = [
  "Surprise",
  "Participation",
  "Humor",
  "Scarcity",
  "Personalization",
  "Transformation",
  "Provocation",
  "Nostalgia",
  "Utility",
  "Immersion",
  "Interaction",
  "Unexpectedness",
  "Community",
  "Simplicity",
  "Craft",
  "Data Storytelling",
  "Cultural Tension",
  "Shareability",
] as const;
export type CreativePrinciple = (typeof CREATIVE_PRINCIPLES)[number];

export const MEDIA_TYPES = ["video", "image", "website", "pdf", "text", "audio"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const REFERENCE_STATUSES = ["queued", "processing", "understood", "failed"] as const;
export type ReferenceStatus = (typeof REFERENCE_STATUSES)[number];

export const PROCESSING_STEPS = [
  "detect",
  "resolve",
  "metadata",
  "media",
  "frames",
  "audio",
  "transcribe",
  "ocr",
  "vision",
  "synthesis",
  "embeddings",
  "relationships",
  "save",
] as const;
export type ProcessingStep = (typeof PROCESSING_STEPS)[number];

export const SIMILARITY_KINDS = ["visual", "conceptual", "strategic", "execution"] as const;
export type SimilarityKind = (typeof SIMILARITY_KINDS)[number];

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#+/, "").toLowerCase().replace(/\s+/g, "");
}

/** Case-insensitive lookup that maps free-form model output back to our canonical labels. */
export function canonical<T extends readonly string[]>(list: T, value: string): T[number] | null {
  const needle = slugify(value);
  for (const item of list) if (slugify(item) === needle) return item;
  return null;
}
