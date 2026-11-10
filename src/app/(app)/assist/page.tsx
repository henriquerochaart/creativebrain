import { AssistMode } from "@/components/assist-mode";
import { dict } from "@/server/lang";

export default async function AssistPage() {
  const { d } = await dict();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="large-title">{d.assist.title}</h1>
      </header>
      <AssistMode />
    </div>
  );
}
