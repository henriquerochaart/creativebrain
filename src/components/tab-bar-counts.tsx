import { statusCounts } from "@/server/references";
import { TabBar } from "./tab-bar";

/** Server half of the tab bar: the Inbox badge counts what still needs attention. */
export async function TabBarWithCounts() {
  const counts = await statusCounts().catch(() => ({}) as Record<string, number>);
  const inbox = (counts.queued ?? 0) + (counts.processing ?? 0) + (counts.failed ?? 0);
  return <TabBar inbox={inbox} />;
}
