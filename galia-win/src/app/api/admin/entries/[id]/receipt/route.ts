import { denyUnlessAdmin, fail } from "@/server/http";
import { getStore } from "@/server/store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await params;
  const receipt = await (await getStore()).receipt(id);
  if (!receipt) return fail("Comprovante não encontrado.", 404);
  const filename = encodeURIComponent(receipt.name);
  return new Response(new Uint8Array(receipt.bytes), {
    headers: {
      "Content-Type": receipt.type,
      "Content-Length": String(receipt.bytes.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
