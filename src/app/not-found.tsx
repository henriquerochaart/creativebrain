import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Not in the Brain.</h1>
      <Link href="/" className="mt-4 inline-block text-sm text-ink-2 hover:text-ink">
        ← Back to all references
      </Link>
    </div>
  );
}
