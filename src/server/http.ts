import { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "./auth";

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: NextRequest, ctx: { params: P }) => Promise<Response> | Response;

/** Wraps a route handler with API-key auth and uniform error handling. */
export function withAuth<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    if (!isAuthorized(req)) return unauthorized();
    try {
      const params = (await ctx?.params) ?? ({} as P);
      return await handler(req, { params });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[api] ${req.method} ${req.nextUrl.pathname}:`, message);
      return Response.json({ error: message }, { status: 500 });
    }
  };
}

export function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export function textStream(chunks: AsyncIterable<string>, onDone?: (full: string) => Promise<void> | void): Response {
  const encoder = new TextEncoder();
  let full = "";
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        await onDone?.(full);
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n[error] ${err instanceof Error ? err.message : String(err)}`));
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
