import { AssistMode } from "@/components/assist-mode";
import { dict } from "@/server/lang";

export default async function AssistPage() {
  const { d } = await dict();
  return (
    <div className="space-y-8">
      <header className="text-center">
        <p className="eyebrow">{d.assist.eyebrow}</p>
        <h1 className="large-title mt-1">{d.assist.title}</h1>
      </header>
      <AssistMode />
    </div>
  );
}
