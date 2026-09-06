/**
 * The heart of the Brain. Never save a reference without understanding it:
 *   CAPTURE → UNDERSTAND → CLASSIFY → CONNECT → REMEMBER → RETRIEVE
 *
 * detect → resolve → metadata → media → frames → audio → transcribe → ocr/vision → synthesis → embeddings → relationships → save
 */
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { references, type Reference, type ReferenceAI, type ReferenceContent, type ReferenceMetadata } from "../db/schema";
import { getLLM, getTranscriber } from "../ai/router";
import { UnderstandingSchema, type Understanding } from "../ai/schemas";
import { ANALYST_SYSTEM, synthesisPrompt } from "../ai/prompts";
import type { AIDocument, AIImage } from "../ai/types";
import { resolveUrl } from "../connectors";
import { extensionFor, getStorage } from "../storage";
import { downloadFile, extractAudio, extractFrames, fetchMediaWithYtDlp, probeMedia, withTempFile } from "./media";
import { ffmpegBinary } from "./binaries";
import { readPdf } from "./pdf";
import { embedReference, toVectorLiteral } from "./embed";
import { rebuildRelations } from "./relate";
import { CREATIVE_PRINCIPLES, FORMATS, SUBJECTS, canonical, normalizeTag, type ProcessingStep } from "../taxonomy";
import { sql } from "drizzle-orm";

const MAX_INLINE_PDF_BYTES = 30 * 1024 * 1024;
const MAX_INLINE_PDF_PAGES = 100;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function setStep(id: string, step: ProcessingStep) {
  await db.update(references).set({ status: "processing", processingStep: step, updatedAt: new Date() }).where(eq(references.id, id));
}

export async function processReference(id: string): Promise<Reference> {
  const [ref] = await db.select().from(references).where(eq(references.id, id));
  if (!ref) throw new Error(`Reference ${id} not found`);
  try {
    const result = await runPipeline(ref);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ingest] ${id} failed:`, message);
    await db
      .update(references)
      .set({ status: "failed", error: message.slice(0, 2000), updatedAt: new Date() })
      .where(eq(references.id, id));
    const [failed] = await db.select().from(references).where(eq(references.id, id));
    return failed;
  }
}

async function runPipeline(ref: Reference): Promise<Reference> {
  const storage = getStorage();
  const warnings: string[] = [];
  let metadata: ReferenceMetadata = { ...ref.metadata };
  const content: ReferenceContent = { ...ref.content, userNote: ref.userNote ?? ref.content.userNote ?? null };
  let platform = ref.sourcePlatform;
  let mediaType = ref.mediaType;
  let canonicalUrl = ref.canonicalUrl ?? ref.originalUrl ?? null;
  let thumbnailUrl = ref.thumbnailUrl;
  let mediaKey = ref.mediaKey;
  let mediaMime = ref.mediaMime;
  let media: { data: Buffer; mime: string } | null = null;

  // 1-3. detect → resolve → metadata (URL references only)
  if (ref.originalUrl) {
    await setStep(ref.id, "resolve");
    const resolved = await resolveUrl(ref.originalUrl);
    platform = resolved.platform;
    mediaType = resolved.mediaType;
    canonicalUrl = resolved.canonicalUrl;
    metadata = { ...metadata, ...resolved.metadata };
    if (resolved.description) content.description = resolved.description;
    if (resolved.pageText) content.pageText = resolved.pageText;
    warnings.push(...(resolved.warnings ?? []));
    await setStep(ref.id, "metadata");

    // Persist the thumbnail so the card survives platform CDN expiry.
    if (resolved.thumbnailUrl && !mediaKey) {
      const thumb = await downloadFile(resolved.thumbnailUrl, MAX_IMAGE_BYTES);
      if (thumb && thumb.mime.startsWith("image/")) {
        const stored = await storage.put(`references/${ref.id}/thumbnail.${extensionFor(thumb.mime)}`, thumb.data, thumb.mime);
        thumbnailUrl = stored.url;
        if (mediaType === "image" && !resolved.mediaUrl) media = thumb;
      } else thumbnailUrl = resolved.thumbnailUrl;
    }

    // 4. media (when permitted)
    await setStep(ref.id, "media");
    if (resolved.mediaUrl) {
      media = await downloadFile(resolved.mediaUrl);
    } else if (resolved.fetchableWithMediaFetcher) {
      media = await fetchMediaWithYtDlp(resolved.canonicalUrl);
      if (!media) warnings.push("Media not retrieved (MEDIA_FETCHER disabled or failed); analysed from metadata + thumbnail");
    }
    if (media) {
      const stored = await storage.put(`references/${ref.id}/media.${extensionFor(media.mime)}`, media.data, media.mime);
      mediaKey = stored.key;
      mediaMime = media.mime;
      if (media.mime.startsWith("video/")) mediaType = "video";
      else if (media.mime.startsWith("image/")) mediaType = "image";
      else if (media.mime === "application/pdf") mediaType = "pdf";
    }
  } else if (mediaKey) {
    // Uploaded file
    await setStep(ref.id, "media");
    const stored = await storage.get(mediaKey);
    if (!stored) throw new Error("Uploaded media not found in storage");
    media = stored;
    mediaMime = stored.mime;
  }

  // 5-8. frames → audio → transcribe → (ocr happens inside vision)
  const images: AIImage[] = [];
  const documents: AIDocument[] = [];
  let frameCount = 0;
  if (media && (media.mime.startsWith("video/") || media.mime.startsWith("audio/"))) {
    const ffmpegOk = Boolean(await ffmpegBinary());
    if (!ffmpegOk) warnings.push("ffmpeg not available: video frames and audio were not extracted (install ffmpeg or the ffmpeg-static package)");
    else {
      await setStep(ref.id, "frames");
      await withTempFile(media.data, extensionFor(media.mime), async (file) => {
        const probe = await probeMedia(file);
        metadata.durationSeconds = probe.durationSeconds ?? metadata.durationSeconds ?? null;
        metadata.width = probe.width ?? metadata.width ?? null;
        metadata.height = probe.height ?? metadata.height ?? null;
        if (media!.mime.startsWith("video/")) {
          const frames = await extractFrames(file, probe.durationSeconds, 8);
          frameCount = frames.length;
          for (const f of frames) images.push({ mime: "image/jpeg", data: f });
          if (!thumbnailUrl && frames[0]) {
            const stored = await storage.put(`references/${ref.id}/thumbnail.jpg`, frames[0], "image/jpeg");
            thumbnailUrl = stored.url;
          }
        }
        if (probe.hasAudio) {
          await setStep(ref.id, "audio");
          const audio = await extractAudio(file);
          const transcriber = getTranscriber();
          if (audio && transcriber) {
            await setStep(ref.id, "transcribe");
            try {
              content.transcript = (await transcriber.transcribe(audio, "audio/mpeg", metadata.title ?? undefined)).trim() || null;
            } catch (err) {
              warnings.push(`Transcription failed: ${err instanceof Error ? err.message : String(err)}`);
            }
          } else if (audio && !transcriber) warnings.push("Transcription skipped: no TRANSCRIPTION_PROVIDER configured");
        }
      });
    }
  } else if (media && media.mime.startsWith("image/")) {
    if (media.data.length <= MAX_IMAGE_BYTES) images.push({ mime: normalizeImageMime(media.mime), data: media.data });
    else warnings.push("Image larger than 5MB; analysed from metadata only");
    if (!thumbnailUrl && mediaKey) thumbnailUrl = storage.url(mediaKey);
  } else if (media && media.mime === "application/pdf") {
    await setStep(ref.id, "ocr");
    try {
      const pdf = await readPdf(media.data);
      metadata.pageCount = pdf.pageCount;
      content.pageText = pdf.text;
      if (media.data.length <= MAX_INLINE_PDF_BYTES && pdf.pageCount <= MAX_INLINE_PDF_PAGES) {
        documents.push({ mime: "application/pdf", data: media.data, name: metadata.title ?? "document.pdf" });
      } else warnings.push("PDF too large to attach; analysed from extracted text");
    } catch (err) {
      warnings.push(`PDF text extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else if (media && media.mime.startsWith("text/")) {
    content.pageText = media.data.toString("utf8").slice(0, 100000);
  }

  // Websites and social posts without media: give the model the thumbnail/OG image to look at.
  if (!images.length && !documents.length && thumbnailUrl) {
    const thumb = await downloadFile(thumbnailUrl, MAX_IMAGE_BYTES);
    if (thumb && thumb.mime.startsWith("image/")) images.push({ mime: normalizeImageMime(thumb.mime), data: thumb.data });
  }

  // 9-10. vision + LLM synthesis (one multimodal call produces the whole semantic file)
  await setStep(ref.id, "synthesis");
  const llm = getLLM();
  const understanding: Understanding = await llm.analyze({
    system: ANALYST_SYSTEM,
    prompt: synthesisPrompt({
      platform,
      mediaType,
      url: canonicalUrl,
      metadata: { ...metadata, description: content.description ?? undefined },
      transcript: content.transcript,
      pageText: content.pageText,
      userNote: content.userNote,
      frameCount,
      documentAttached: documents.length > 0,
    }),
    images,
    documents,
    schema: UnderstandingSchema,
    schemaName: "understanding",
  });

  const ai = toReferenceAI(understanding, llm.model);
  content.visualAnalysis = understanding.visualAnalysis;
  content.ocr = understanding.visualAnalysis.onScreenText.join("\n") || null;
  const title = understanding.title || metadata.title || ref.title || canonicalUrl || "Untitled";
  const brand = understanding.brand ?? metadata.brand ?? null;
  const searchText = buildSearchText({ ai, content, metadata });

  // 11. embeddings
  await setStep(ref.id, "embeddings");
  const vectors = await embedReference({ title, brand, ai, content });

  // 13. save (before relationships so the graph step can see this reference as understood)
  await setStep(ref.id, "save");
  await db
    .update(references)
    .set({
      title,
      brand,
      sourcePlatform: platform,
      mediaType,
      canonicalUrl,
      thumbnailUrl,
      mediaKey,
      mediaMime,
      mediaBytes: media?.data.length ?? ref.mediaBytes,
      metadata: { ...metadata, warnings },
      content,
      ai,
      subjects: ai.subjects ?? [],
      formats: ai.formats ?? [],
      tags: ai.tags ?? [],
      principles: ai.creativePrinciples ?? [],
      concepts: ai.concepts ?? [],
      searchText,
      embeddingContent: vectors.content,
      embeddingVisual: vectors.visual,
      embeddingStrategic: vectors.strategic,
      embeddingExecution: vectors.execution,
      status: "understood",
      processingStep: null,
      error: null,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(references.id, ref.id));

  // 12. relationships
  await db.update(references).set({ processingStep: "relationships" }).where(eq(references.id, ref.id));
  try {
    await rebuildRelations(ref.id);
  } catch (err) {
    console.warn("[ingest] relationships failed:", err);
  }
  await db.update(references).set({ processingStep: null }).where(eq(references.id, ref.id));

  const [saved] = await db.select().from(references).where(eq(references.id, ref.id));
  return saved;
}

function normalizeImageMime(mime: string): string {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mime) ? mime : "image/jpeg";
}

export function toReferenceAI(u: Understanding, model: string): ReferenceAI {
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))];
  return {
    summary: u.summary,
    whatItIs: u.whatItIs,
    whyInteresting: u.whyInteresting,
    creativeMechanism: u.creativeMechanism,
    coreIdea: u.coreIdea,
    concepts: uniq(u.concepts.map((c) => c.trim().toLowerCase())),
    tags: uniq(u.tags.map(normalizeTag)),
    creativePrinciples: uniq(u.creativePrinciples.map((p) => canonical(CREATIVE_PRINCIPLES, p) as string | null).filter((p): p is string => p !== null)),
    emotionalAttributes: uniq(u.emotionalAttributes),
    strategicAttributes: uniq(u.strategicAttributes),
    subjects: uniq(u.subjects.map((s) => canonical(SUBJECTS, s) as string | null).filter((s): s is string => s !== null)),
    formats: uniq(u.formats.map((f) => canonical(FORMATS, f) as string | null).filter((f): f is string => f !== null)),
    brands: uniq(u.brands),
    people: uniq(u.people),
    audience: u.audience ?? undefined,
    model,
    generatedAt: new Date().toISOString(),
  };
}

export function buildSearchText(input: { ai: ReferenceAI; content: ReferenceContent; metadata: ReferenceMetadata }): string {
  const { ai, content, metadata } = input;
  return [
    ai.summary,
    ai.whatItIs,
    ai.whyInteresting,
    ai.creativeMechanism,
    ai.coreIdea,
    ai.tags?.join(" "),
    ai.concepts?.join(" "),
    ai.creativePrinciples?.join(" "),
    ai.subjects?.join(" "),
    ai.formats?.join(" "),
    ai.brands?.join(" "),
    ai.people?.join(" "),
    ai.strategicAttributes?.join(" "),
    ai.emotionalAttributes?.join(" "),
    metadata.author,
    metadata.siteName,
    content.description,
    content.ocr,
    content.transcript?.slice(0, 20000),
    content.pageText?.slice(0, 20000),
    content.userNote,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Re-embeds every understood reference (after changing EMBEDDING_* settings). */
export async function reembedAll() {
  const rows = await db.select().from(references).where(eq(references.status, "understood"));
  for (const ref of rows) {
    const vectors = await embedReference(ref);
    await db.execute(sql`
      UPDATE "references" SET
        embedding_content = ${toVectorLiteral(vectors.content)}::vector,
        embedding_visual = ${toVectorLiteral(vectors.visual)}::vector,
        embedding_strategic = ${toVectorLiteral(vectors.strategic)}::vector,
        embedding_execution = ${toVectorLiteral(vectors.execution)}::vector
      WHERE id = ${ref.id}`);
    await rebuildRelations(ref.id);
  }
  return rows.length;
}
