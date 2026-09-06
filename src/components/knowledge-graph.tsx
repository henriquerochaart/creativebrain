"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Node = { id: string; type: "reference" | "principle" | "brand"; label: string; thumb?: string | null; platform?: string; weight: number };
type Edge = { source: string; target: string; kind: string; score: number };
type Sim = Node & { x: number; y: number; vx: number; vy: number; r: number };

const KIND_COLOR: Record<string, string> = {
  conceptual: "#6b7280",
  visual: "#ec4899",
  strategic: "#0ea5e9",
  execution: "#f59e0b",
  principle: "#ff4d1c",
  brand: "#10b981",
};

/**
 * Force-directed knowledge graph drawn on canvas. No library: ~120 lines of physics.
 * References are dots (thumbnail on hover), principles and brands are hubs.
 */
export function KnowledgeGraph() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kinds, setKinds] = useState<Record<string, boolean>>({ conceptual: true, visual: true, strategic: true, execution: true, principle: true, brand: true });
  const [hover, setHover] = useState<Sim | null>(null);
  const simRef = useRef<{ nodes: Sim[]; byId: Map<string, Sim>; edges: Edge[] } | null>(null);

  useEffect(() => {
    api<{ nodes: Node[]; edges: Edge[] }>("/api/graph")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "failed"));
  }, []);

  const activeEdges = useMemo(() => data?.edges.filter((e) => kinds[e.kind]) ?? [], [data, kinds]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const W = (canvas.width = canvas.clientWidth * devicePixelRatio);
    const H = (canvas.height = canvas.clientHeight * devicePixelRatio);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const w = W / devicePixelRatio;
    const h = H / devicePixelRatio;

    const nodes: Sim[] = data.nodes.map((n, i) => ({
      ...n,
      x: w / 2 + Math.cos(i) * (w / 4) * Math.random(),
      y: h / 2 + Math.sin(i) * (h / 4) * Math.random(),
      vx: 0,
      vy: 0,
      r: n.type === "reference" ? 4 + Math.min(n.weight, 12) * 0.6 : 10 + Math.min(n.weight, 30) * 0.5,
    }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    simRef.current = { nodes, byId, edges: activeEdges };
    const degree = new Map<string, number>();
    for (const e of activeEdges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }

    let frame = 0;
    let raf = 0;
    const isDark = matchMedia("(prefers-color-scheme: dark)").matches;
    const tick = () => {
      frame++;
      const alpha = Math.max(0.02, 0.6 * Math.exp(-frame / 120));
      // repulsion
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy || 0.01;
          if (d2 > 90000) continue;
          const f = (900 / d2) * alpha;
          dx *= f;
          dy *= f;
          a.vx += dx;
          a.vy += dy;
          b.vx -= dx;
          b.vy -= dy;
        }
      }
      // springs
      for (const e of activeEdges) {
        const a = byId.get(e.source);
        const b = byId.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const target = e.kind === "principle" || e.kind === "brand" ? 90 : 60;
        const f = ((d - target) / d) * 0.05 * alpha * (e.kind === "principle" || e.kind === "brand" ? 1 : e.score);
        a.vx += dx * f;
        a.vy += dy * f;
        b.vx -= dx * f;
        b.vy -= dy * f;
      }
      // gravity + integrate
      for (const n of nodes) {
        n.vx += (w / 2 - n.x) * 0.002 * alpha;
        n.vy += (h / 2 - n.y) * 0.002 * alpha;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x = Math.max(n.r, Math.min(w - n.r, n.x + n.vx));
        n.y = Math.max(n.r, Math.min(h - n.r, n.y + n.vy));
      }
      // draw
      ctx.clearRect(0, 0, w, h);
      for (const e of activeEdges) {
        const a = byId.get(e.source);
        const b = byId.get(e.target);
        if (!a || !b) continue;
        ctx.strokeStyle = KIND_COLOR[e.kind] ?? "#999";
        ctx.globalAlpha = e.kind === "principle" || e.kind === "brand" ? 0.12 : 0.1 + e.score * 0.35;
        ctx.lineWidth = e.kind === "principle" || e.kind === "brand" ? 1 : 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const n of nodes) {
        if (n.type === "reference") {
          ctx.fillStyle = isDark ? "#f3f3f1" : "#111111";
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
          if ((degree.get(n.id) ?? 0) >= 4 || n.r > 8) {
            ctx.fillStyle = isDark ? "#a9a9ad" : "#5b5b60";
            ctx.font = "11px -apple-system, Inter, sans-serif";
            ctx.fillText(n.label.slice(0, 28), n.x + n.r + 4, n.y + 4);
          }
        } else {
          ctx.fillStyle = KIND_COLOR[n.type];
          ctx.globalAlpha = 0.15;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = KIND_COLOR[n.type];
          ctx.font = "600 11px -apple-system, Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(n.label.toUpperCase(), n.x, n.y + 4);
          ctx.textAlign = "start";
        }
      }
      if (frame < 600) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, activeEdges]);

  function pick(e: React.MouseEvent<HTMLCanvasElement>): Sim | null {
    const sim = simRef.current;
    if (!sim) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let best: Sim | null = null;
    let bd = 14;
    for (const n of sim.nodes) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < n.r + 6 && d < bd) {
        best = n;
        bd = d;
      }
    }
    return best;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        {Object.keys(kinds).map((k) => (
          <button key={k} type="button" onClick={() => setKinds({ ...kinds, [k]: !kinds[k] })} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${kinds[k] ? "border-line" : "border-transparent opacity-40"}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[k] }} /> {k}
          </button>
        ))}
        {data && (
          <span className="ml-auto text-ink-3">
            {data.nodes.filter((n) => n.type === "reference").length} references · {activeEdges.length} connections
          </span>
        )}
      </div>
      <div className="relative h-[70vh] overflow-hidden rounded-3xl border border-line bg-paper">
        {error && <p className="p-6 text-sm text-red-600">{error}</p>}
        {!data && !error && <p className="pulse-soft p-6 text-sm text-ink-3">Loading the graph…</p>}
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair"
          onMouseMove={(e) => setHover(pick(e))}
          onClick={(e) => {
            const n = pick(e);
            if (!n) return;
            if (n.type === "reference") router.push(`/r/${n.id}`);
            else if (n.type === "principle") router.push(`/c/principle/${encodeURIComponent(n.label)}`);
            else router.push(`/c/brand/${encodeURIComponent(n.label)}`);
          }}
        />
        {hover && (
          <div className="pointer-events-none absolute left-4 top-4 flex max-w-xs items-center gap-3 rounded-2xl border border-line bg-paper/95 p-3 shadow-lg backdrop-blur">
            {hover.thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hover.thumb} alt="" className="h-14 w-20 rounded-lg object-cover" />
            )}
            <div>
              <p className="eyebrow">{hover.type === "reference" ? hover.platform : hover.type}</p>
              <p className="text-sm font-medium leading-snug">{hover.label}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
