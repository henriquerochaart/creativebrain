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

server.registerTool(
  "develop_idea",
  { description: "Creative assistant: develops an idea or brief using only the user's repertoire (V2). Returns markdown.", inputSchema: { idea: z.string() } },
  async ({ idea }) => {
    const res = await fetch(`${BRAIN_URL}/api/assist`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(BRAIN_API_KEY ? { authorization: `Bearer ${BRAIN_API_KEY}` } : {}) },
      body: JSON.stringify({ idea }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return text(await res.text());
  },
);

type MoodboardRes = {
  board: { id: string };
  analysis: { title: string; concept: string; tone: string[]; palette: string[]; directions: { title: string; rationale: string; referenceIds: string[] }[]; missing: string[] };
  references: Record<string, Ref>;
};

server.registerTool(
  "generate_moodboard",
  { description: "Assembles a moodboard from the repertoire for a brief and saves it. Returns directions with reference titles.", inputSchema: { brief: z.string() } },
  async ({ brief }) => {
    const res = await api<MoodboardRes>("/api/moodboards", { method: "POST", body: JSON.stringify({ brief }) });
    const name = (id: string) => res.references[id]?.title ?? id;
    const a = res.analysis;
    const lines = [
      `${a.title}\n${a.concept}`,
      `Tone: ${a.tone.join(", ")} · Palette: ${a.palette.join(", ")}`,
      ...a.directions.map((d, i) => `${String(i + 1).padStart(2, "0")}  ${d.title}\n    ${d.rationale}\n    ${d.referenceIds.map(name).join(" · ")}`),
      a.missing.length ? `MISSING\n${a.missing.map((m) => `→ ${m}`).join("\n")}` : null,
      `Board: ${BRAIN_URL}/moodboards/${res.board.id}`,
    ];
    return text(lines.filter(Boolean).join("\n\n"));
  },
);

type DiscoverRes = {
  signals: number;
  favourites: { principles: string[] };
  forYou: { reference: Ref; score: number }[];
  unexpected: { reference: Ref; score: number; because: string }[];
};

server.registerTool("discover", { description: "Personal taste: references close to what the user likes but not yet touched, and unexpected ones from a different angle.", inputSchema: {} }, async () => {
  const d = await api<DiscoverRes>("/api/discover");
  if (!d.signals) return text("No taste signals yet: star, collect or ask about references first.");
  const unexpected = d.unexpected.map((u) => `${Math.round(u.score * 100)}%  ${line(u.reference)}\n  because it ${u.because}`).join("\n\n");
  const forYou = d.forYou.map((f) => `${Math.round(f.score * 100)}%  ${line(f.reference)}`).join("\n\n");
  return text([`Taste from ${d.signals} signals. Favourite principles: ${d.favourites.principles.join(", ")}`, `UNEXPECTED\n${unexpected}`, `FOR YOU\n${forYou}`].join("\n\n"));
});

server.registerTool("list_projects", { description: "V3 projects (creative processes) with reference counts.", inputSchema: {} }, async () => {
  const res = await api<{ projects: { id: string; name: string; brief: string | null; count: number; analyzed_at: string | null }[] }>("/api/projects");
  const rows = res.projects.map((p) => `${p.name} (${p.count} refs${p.analyzed_at ? ", analysed" : ""}) — ${p.id}${p.brief ? `\n  ${p.brief}` : ""}`);
  return text(rows.join("\n") || "No projects.");
});

server.registerTool(
  "project_output",
  { description: "Full output of a project as markdown: references, concepts, patterns, directions, ideas.", inputSchema: { projectId: z.string() } },
  async ({ projectId }) => {
    const res = await fetch(`${BRAIN_URL}/api/projects/${projectId}/output`, { headers: BRAIN_API_KEY ? { authorization: `Bearer ${BRAIN_API_KEY}` } : {} });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return text(await res.text());
  },
);

server.registerTool(
  "add_to_project",
  { description: "Adds a reference to a project.", inputSchema: { projectId: z.string(), referenceId: z.string(), note: z.string().optional() } },
  async ({ projectId, referenceId, note }) => {
    await api(`/api/projects/${projectId}/references`, { method: "POST", body: JSON.stringify({ referenceId, note }) });
    return text("Added.");
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
