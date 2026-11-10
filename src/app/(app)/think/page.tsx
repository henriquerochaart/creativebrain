import { ThinkMode } from "@/components/think-mode";
import { dict } from "@/server/lang";

export default async function ThinkPage() {
  const { d } = await dict();
  return (
    // The title sits on the same column as the content below it.
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="large-title">{d.think.title}</h1>
      </header>
      <ThinkMode />
    </div>
  );
}
