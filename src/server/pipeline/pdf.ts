import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";

export type PdfInfo = { text: string; pageCount: number };

export async function readPdf(data: Buffer): Promise<PdfInfo> {
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text: (Array.isArray(text) ? text.join("\n") : text).replace(/\s+\n/g, "\n").trim(), pageCount: totalPages };
}

/**
 * Renders the first page as a PNG so a deck's own cover becomes its thumbnail, instead of a
 * placeholder. Needs the optional @napi-rs/canvas native module; returns null when it is not
 * installed for this platform, and the caller falls back as before.
 */
export async function renderPdfFirstPage(data: Buffer, width = 900): Promise<Buffer | null> {
  try {
    const png = await renderPageAsImage(new Uint8Array(data), 1, {
      canvasImport: () => import("@napi-rs/canvas"),
      width,
    });
    const buf = Buffer.from(png);
    return buf.length > 100 ? buf : null;
  } catch (err) {
    console.warn("[pdf] first-page render unavailable:", err instanceof Error ? err.message : err);
    return null;
  }
}
