import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminBoard, type BoardEntry } from "@/components/admin/board";
import { event } from "@/config/event";
import { isAdmin } from "@/server/auth";
import { mailConfigured } from "@/server/mail";
import { duplicateSignals, getStore } from "@/server/store";

export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Admin() {
  if (!(await isAdmin())) redirect("/admin/login");
  const entries = await (await getStore()).list();
  const signals = duplicateSignals(entries);
  const rows: BoardEntry[] = entries.map((entry) => {
    const { sameReceipt, sameEmail } = signals(entry);
    return { ...entry, sameReceipt: sameReceipt.map((other) => other.name), sameEmail: sameEmail.length };
  });
  return <AdminBoard entries={rows} price={event.price} mailReady={mailConfigured()} />;
}
