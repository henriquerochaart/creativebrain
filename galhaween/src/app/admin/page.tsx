import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminBoard, type BoardEntry } from "@/components/admin/board";
import { event } from "@/config/event";
import { NoDatabase } from "@/components/no-database";
import { isAdmin } from "@/server/auth";
import { dbConfigured } from "@/server/db";
import { mailConfigured } from "@/server/mail";
import { duplicateSignals, getStore } from "@/server/store";

export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Admin() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!dbConfigured()) return <NoDatabase admin />;
  const store = await getStore();
  const [entries, referrers] = await Promise.all([store.list(), store.listReferrers()]);
  const signals = duplicateSignals(entries);
  const rows: BoardEntry[] = entries.map((entry) => {
    const { sameReceipt, sameEmail } = signals(entry);
    return { ...entry, sameReceipt: sameReceipt.map((other) => other.name), sameEmail: sameEmail.length };
  });
  return (
    <AdminBoard
      entries={rows}
      referrers={referrers.filter((r) => r.count > 0 || r.rewardStatus !== "none")}
      referralGoal={event.referralGoal}
      price={event.price}
      mailReady={mailConfigured()}
    />
  );
}
