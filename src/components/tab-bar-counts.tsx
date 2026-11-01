import { statusCounts } from "@/server/references";
import { TabBar } from "./tab-bar";

/** Server half of the tab bar: the Settings badge counts references that failed and need a look. */
export async function TabBarWithCounts() {
  const counts = await statusCounts().catch(() => ({}) as Record<string, number>);
  return <TabBar failed={counts.failed ?? 0} />;
}
