import { withAuth } from "@/server/http";
import { proposeCollections } from "@/server/creative";
import { getLang } from "@/server/lang";

export const runtime = "nodejs";
export const maxDuration = 120;
/** POST /api/collections/propose — the Brain notices patterns and proposes collections. */
export const POST = withAuth(async () => Response.json(await proposeCollections(await getLang())));
