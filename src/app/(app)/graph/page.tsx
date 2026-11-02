import { KnowledgeGraph } from "@/components/knowledge-graph";
import { dict } from "@/server/lang";

export default async function GraphPage() {
  const { d } = await dict();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="large-title">{d.graph.title}</h1>
      </header>
      <KnowledgeGraph />
    </div>
  );
}
