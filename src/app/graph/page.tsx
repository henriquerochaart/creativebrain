import { KnowledgeGraph } from "@/components/knowledge-graph";

export default function GraphPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Knowledge graph</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">How your references connect</h1>
        <p className="mt-1 text-sm text-ink-2">Dots are references. Coloured lines are the four kinds of similarity. Hubs are creative principles and brands. Click anything.</p>
      </header>
      <KnowledgeGraph />
    </div>
  );
}
