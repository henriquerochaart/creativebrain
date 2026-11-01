import Link from "next/link";
import { dict } from "@/server/lang";
import { Mascot } from "@/components/mascot";

export default async function NotFound() {
  const { d } = await dict();
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <Mascot pose="surpreso" className="h-40 w-40" />
      <h1 className="large-title mt-4">{d.notFound.title}</h1>
      <Link href="/" className="mt-4 inline-block text-sm text-ink-2 hover:text-ink">
        ← {d.notFound.back}
      </Link>
    </div>
  );
}
