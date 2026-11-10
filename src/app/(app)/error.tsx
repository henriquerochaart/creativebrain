"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { Mascot } from "@/components/mascot";
import { useT } from "@/components/lang-provider";

/**
 * Any screen that throws lands here, inside the shell, so the tab bar still works: Brain skeptical,
 * one line, a way to try again and a way home. The digest goes to the console for the logs.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const d = useT();
  const router = useRouter();
  useEffect(() => {
    console.error("[app] screen failed", error.digest ?? "", error.message);
  }, [error]);
  return (
    <div role="alert" className="flex flex-col items-center py-16 text-center">
      <Mascot pose="desconfiado" className="h-40 w-40" />
      <h1 className="large-title mt-4">{d.errorPage.title}</h1>
      {/* reset() alone only re-renders the client; a server failure needs the page fetched again. */}
      <button type="button" onClick={() => startTransition(() => { router.refresh(); reset(); })} className="btn-filled mt-6 h-11 px-6 text-[17px] lg:h-9">
        {d.errorPage.retry}
      </button>
      <Link href="/" className="mt-3 inline-flex h-11 items-center text-[15px] text-ink-2 hover:text-ink">
        {d.errorPage.home}
      </Link>
    </div>
  );
}
