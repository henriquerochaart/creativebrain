import { BrainLoading } from "@/components/brain-loading";

/** Every page renders on the server; while it does, the tab bar and sidebar stay and this fills the content. */
export default function Loading() {
  return <BrainLoading />;
}
