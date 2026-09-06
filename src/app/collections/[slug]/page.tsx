import { notFound } from "next/navigation";
import { Suspense } from "react";
import { collectionReferences, getCollection, toPublic } from "@/server/references";
import { ReferenceGrid } from "@/components/reference-grid";
import { CaptureBox } from "@/components/capture-box";
import { DeleteCollection } from "@/components/collection-actions";

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const col = await getCollection(slug);
  if (!col) notFound();
  const refs = await collectionReferences(col.id);
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Collection</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {col.emoji ? `${col.emoji} ` : ""}
            {col.name}
          </h1>
          {col.description && <p className="mt-1 text-sm text-ink-2">{col.description}</p>}
        </div>
        <DeleteCollection id={col.id} />
      </header>
      <Suspense>
        <CaptureBox collectionId={col.id} compact />
      </Suspense>
      <ReferenceGrid references={refs.map(toPublic)} showStatus empty="Empty. Add references from their page, or capture straight into this collection above." />
    </div>
  );
}
