import { extractText, getDocumentProxy } from "unpdf";

export type PdfInfo = { text: string; pageCount: number };

export async function readPdf(data: Buffer): Promise<PdfInfo> {
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text: (Array.isArray(text) ? text.join("\n") : text).replace(/\s+\n/g, "\n").trim(), pageCount: totalPages };
}
