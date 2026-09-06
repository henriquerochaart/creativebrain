import { NextRequest } from "next/server";
import { withAuth, bad } from "@/server/http";
import { captureUpload, toPublic } from "@/server/references";

export const runtime = "nodejs";
export const maxDuration = 120;

/** POST /api/upload — multipart with `file` (image, video, pdf, text) and optional `note`, `collectionId`. */
export const POST = withAuth(async (req: NextRequest) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return bad("`file` is required");
  const data = Buffer.from(await file.arrayBuffer());
  if (!data.length) return bad("Empty file");
  const ref = await captureUpload(
    { name: file.name, mime: file.type || guessMime(file.name), data },
    { note: form.get("note")?.toString() || undefined, collectionId: form.get("collectionId")?.toString() || undefined },
  );
  return Response.json({ reference: toPublic(ref) }, { status: 201 });
});

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", pdf: "application/pdf", txt: "text/plain", md: "text/markdown", mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav" };
  return (ext && map[ext]) || "application/octet-stream";
}
