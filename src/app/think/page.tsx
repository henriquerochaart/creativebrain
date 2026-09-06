import { ThinkMode } from "@/components/think-mode";

export default function ThinkPage() {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <p className="eyebrow">Think mode</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">What are you looking for?</h1>
      </header>
      <ThinkMode />
    </div>
  );
}
