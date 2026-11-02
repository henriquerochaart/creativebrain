import { HomeSkeleton } from "@/components/skeletons";

/** Início in a route group so it can have its own skeleton; the root loading.tsx stays Brain in love for the rest. */
export default function Loading() {
  return <HomeSkeleton />;
}
