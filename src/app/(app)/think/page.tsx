import { ThinkMode } from "@/components/think-mode";
import { dict } from "@/server/lang";

export default async function ThinkPage() {
  const { d } = await dict();
  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="large-title">{d.think.title}</h1>
      </header>
      <ThinkMode />
    </div>
  );
}
