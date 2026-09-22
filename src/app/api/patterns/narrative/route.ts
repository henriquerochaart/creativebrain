import { withAuth } from "@/server/http";
import { tasteNarrative } from "@/server/creative";
import { getLang } from "@/server/lang";

export const runtime = "nodejs";
export const maxDuration = 120;
/** POST /api/patterns/narrative — "Things you seem to like", written by the model over the aggregates. */
export const POST = withAuth(async () => Response.json(await tasteNarrative(await getLang())));
