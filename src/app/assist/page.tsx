import { AssistMode } from "@/components/assist-mode";

export default function AssistPage() {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <p className="eyebrow">Creative assistant</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Use my repertoire to develop this idea</h1>
      </header>
      <AssistMode />
    </div>
  );
}
