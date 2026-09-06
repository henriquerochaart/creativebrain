import { withAuth } from "@/server/http";
import { aiStatus } from "@/server/ai/router";
import { platformCounts, statusCounts } from "@/server/references";
import { env } from "@/server/env";
export const runtime = "nodejs";
export const GET = withAuth(async () =>
  Response.json({
    ai: aiStatus(),
    processingMode: env.processingMode,
    storage: env.storage.driver,
    mediaFetcher: env.connectors.mediaFetcher,
    counts: { status: await statusCounts(), platforms: await platformCounts() },
  }),
);
