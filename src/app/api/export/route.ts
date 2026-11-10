import { withAuth } from "@/server/http";
import { exportLibrary } from "@/server/library";
import { userId } from "@/server/tenant";

export const runtime = "nodejs";

/** GET /api/export — the signed-in account's whole library as one JSON file (Ajustes → Exportar). */
export const GET = withAuth(async () => {
  const library = await exportLibrary(await userId());
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(library, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="brain-${day}.json"`,
      "cache-control": "no-store",
    },
  });
});
