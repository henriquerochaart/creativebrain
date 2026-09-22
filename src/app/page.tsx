import { Suspense } from "react";
import { CaptureBox } from "@/components/capture-box";
import { ReferenceGrid } from "@/components/reference-grid";
import { LiveRefresh } from "@/components/live-refresh";
import { listReferences, toPublic } from "@/server/references";
import { dict } from "@/server/lang";

export default async function Home() {
  const { lang, d } = await dict();
  const rows = await listReferences({ limit: 120 }).catch(() => []);
  const refs = rows.map(toPublic);
  const processing = refs.some((r) => r.status === "queued" || r.status === "processing");
  return (
    <div className="space-y-10">
      <section className="pt-6">
        {/* The page still needs one heading; it just should not be shouted at the reader. */}
        <h1 className="sr-only">{d.app.name}</h1>
        <Suspense>
          <CaptureBox />
        </Suspense>
      </section>
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="eyebrow">{d.home.allReferences}</h2>
          <span className="text-[12px] text-ink-3">{refs.length}</span>
        </div>
        <ReferenceGrid
          references={refs}
          lang={lang}
          showStatus
          empty={
            <>
              {d.home.emptyTitle}
              <br />
              {d.home.emptySub}
            </>
          }
        />
      </section>
      <LiveRefresh active={processing} />
    </div>
  );
}
