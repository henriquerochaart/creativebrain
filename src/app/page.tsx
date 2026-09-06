import { Suspense } from "react";
import { CaptureBox } from "@/components/capture-box";
import { ReferenceGrid } from "@/components/reference-grid";
import { LiveRefresh } from "@/components/live-refresh";
import { listReferences, toPublic } from "@/server/references";

export default async function Home() {
  const rows = await listReferences({ limit: 120 }).catch(() => []);
  const refs = rows.map(toPublic);
  const processing = refs.some((r) => r.status === "queued" || r.status === "processing");
  return (
    <div className="space-y-10">
      <section className="pt-6">
        <h1 className="mb-6 text-center text-[13px] font-semibold uppercase tracking-[0.2em] text-ink-3">Never save a reference without understanding it</h1>
        <Suspense>
          <CaptureBox />
        </Suspense>
      </section>
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="eyebrow">All references</h2>
          <span className="text-[12px] text-ink-3">{refs.length}</span>
        </div>
        <ReferenceGrid
          references={refs}
          showStatus
          empty={
            <>
              Your brain is empty. Paste an Instagram reel, a TikTok, a YouTube link, a website or drop a PDF above.
              <br />
              The system will understand it and it will appear here.
            </>
          }
        />
      </section>
      <LiveRefresh active={processing} />
    </div>
  );
}
