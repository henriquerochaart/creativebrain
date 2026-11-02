import { GallerySkeleton } from "@/components/skeletons";

/** A collection: its own name is not known until the page arrives, so the title is a bone. */
export default function Loading() {
  return <GallerySkeleton />;
}
