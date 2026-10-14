import Link from "next/link";
import { dict } from "@/server/lang";

export default async function NotFound() {
  const { d } = await dict();
  return (
    <div className="py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="large-title mt-2">{d.notFound.title}</h1>
      <Link href="/" className="mt-4 inline-block text-sm text-ink-2 hover:text-ink">
        ← {d.notFound.back}
      </Link>
    </div>
  );
}
