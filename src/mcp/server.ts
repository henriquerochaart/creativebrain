/**
 * Henrique Brain — MCP server (stdio).
 * Lets Claude, ChatGPT, Gemini, Figma AI or any agent consult the repertoire.
 *
 *   BRAIN_URL=http://localhost:3000 BRAIN_API_KEY=... npm run mcp
 *
 * Claude Desktop / Claude Code config:
 *   { "mcpServers": { "henrique-brain": { "command": "npx", "args": ["tsx", "src/mcp/server.ts"], "env": { "BRAIN_URL": "...", "BRAIN_API_KEY": "..." } } } }
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BRAIN_URL = (process.env.BRAIN_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BRAIN_API_KEY = process.env.BRAIN_API_KEY ?? "";

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BRAIN_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(BRAIN_API_KEY ? { authorization: `Bearer ${BRAIN_API_KEY}` } : {}), ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

type Ref = {
  id: string;
  title: string | null;
  brand: string | null;
  sourcePlatform: string;
  mediaType: string;
  canonicalUrl: string | null;
  thumbnailUrl: string | null;
  subjects: string[];
  formats: string[];
  tags: string[];
  principles: string[];
  ai: { summary?: string; whatItIs?: string; whyInteresting?: string; creativeMechanism?: string; coreIdea?: string; concepts?: string[]; strategicAttributes?: string[] };
};

function line(r: Ref): string {
  return [
    `[${r.id}] ${r.title ?? "Untitled"}${r.brand ? ` — ${r.brand}` : ""} (${r.sourcePlatform} · ${r.mediaType})`,
    r.ai.summary ? `  ${r.ai.summary}` : null,
    r.ai.creativeMechanism ? `  Mechanism: ${r.ai.creativeMechanism}` : null,
    r.principles.length ? `  Principles: ${r.principles.join(", ")}` : null,
    r.canonicalUrl ? `  ${r.canonicalUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

const server = new McpServer({ name: "henrique-brain", version: "0.1.0" });

server.registerTool(
  "search_references",
  {
    description: "Search Henrique's creative repertoire. Hybrid search (keyword + semantic + conceptual + visual). Ask in natural language, e.g. 'campaigns that use audience participation and humor'.",
    inputSchema: {
      query: z.string(),
      mode: z.enum(["hybrid", "keyword", "semantic", "visual", "conceptual"]).optional(),
      platform: z.string().optional(),
      subject: z.string().optional(),
      format: z.string().optional(),
      principle: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  },
  async (args) => {
    const p = new URLSearchParams({ q: args.query });
    for (const k of ["mode", "platform", "subject", "format", "principle", "limit"] as const) {
      const v = args[k];
      if (v !== undefined) p.set(k, String(v));
    }
    const res = await api<{ hits: { reference: Ref; score: number }[]; degraded?: string }>(`/api/search?${p}`);
    const body = res.hits.map((h) => line(h.reference)).join("\n\n") || "No references found.";
    return text(`${res.degraded ? `(${res.degraded})\n\n` : ""}${body}`);
  },
);

server.registerTool(
  "get_reference",
  { description: "Full semantic file of one reference: what it is, why it's interesting, mechanism, principles, visual analysis, transcript.", inputSchema: { id: z.string() } },
  async ({ id }) => {
    const res = await api<{ reference: Ref & { content: Record<string, unknown> } }>(`/api/references/${id}`);
    return text(JSON.stringify(res.reference, null, 2));
  },
);

server.registerTool(
  "similar_references",
  { description: "References similar to a given one, in four dimensions: visual, conceptual, strategic, execution.", inputSchema: { id: z.string(), limit: z.number().int().min(1).max(20).optional() } },
  async ({ id, limit }) => {
    const res = await api<{ byKind: Record<string, { reference: Ref; score: number }[]> }>(`/api/references/${id}/similar?limit=${limit ?? 5}`);
    const out = Object.entries(res.byKind)
      .map(([kind, items]) => `${kind.toUpperCase()}\n${items.map((i) => `${Math.round(i.score * 100)}%  ${line(i.reference)}`).join("\n")}`)
      .join("\n\n");
    return text(out || "No similar references yet.");
  },
);

server.registerTool(
  "think",
  { description: "Think mode: give a brief or a question; the Brain retrieves the repertoire, clusters it, names patterns, points to the strongest references and gaps.", inputSchema: { query: z.string() } },
  async ({ query }) => {
    const res = await api<{ found: number; analysis: { intro: string; clusters: { title: string; rationale: string; referenceIds: string[] }[]; strongest: string[]; patterns: string[]; gaps: string[] }; references: Record<string, Ref> }>(
      "/api/think",
      { method: "POST", body: JSON.stringify({ query }) },
    );
    const a = res.analysis;
    const name = (id: string) => res.references[id]?.title ?? id;
    const out = [
      a.intro,
      ...a.clusters.map((c, i) => `${String(i + 1).padStart(2, "0")}  ${c.title}\n    ${c.rationale}\n    ${c.referenceIds.map(name).join(" · ")}`),
      `STRONGEST\n${a.strongest.map((id) => `→ ${name(id)} [${id}]`).join("\n")}`,
      `PATTERNS\n${a.patterns.map((p) => `→ ${p}`).join("\n")}`,
      a.gaps.length ? `GAPS\n${a.gaps.map((g) => `→ ${g}`).join("\n")}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    return text(out);
  },
);

server.registerTool("list_collections", { description: "List manual collections in the Brain.", inputSchema: {} }, async () => {
  const res = await api<{ collections: { id: string; name: string; emoji: string | null; count: number }[] }>("/api/collections");
  return text(res.collections.map((c) => `${c.emoji ?? "•"} ${c.name} (${c.count}) — ${c.id}`).join("\n") || "No collections.");
});

server.registerTool(
  "list_creative_principles",
  { description: "Creative principles vocabulary with how many references use each.", inputSchema: {} },
  async () => {
    const res = await api<{ principles: { value: string; count: number }[] }>("/api/creative-principles");
    return text(res.principles.map((p) => `${p.value}: ${p.count}`).join("\n"));
  },
);

server.registerTool(
  "capture_reference",
  { description: "Save a new reference (URL or text) into the Brain. It will be understood asynchronously.", inputSchema: { input: z.string(), note: z.string().optional() } },
  async ({ input, note }) => {
    const res = await api<{ reference: Ref; duplicate: boolean }>("/api/references", { method: "POST", body: JSON.stringify({ input, note }) });
    return text(`${res.duplicate ? "Already in the Brain" : "Captured"}: ${res.reference.id}`);
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
