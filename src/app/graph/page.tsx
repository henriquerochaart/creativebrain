import { KnowledgeGraph } from "@/components/knowledge-graph";
import { dict } from "@/server/lang";

export default async function GraphPage() {
  const { d } = await dict();
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{d.graph.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{d.graph.title}</h1>
        <p className="mt-1 text-sm text-ink-2">{d.graph.sub}</p>
      </header>
      <KnowledgeGraph />
    </div>
  );
}
