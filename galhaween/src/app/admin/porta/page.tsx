import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DoorScanner } from "@/components/admin/door-scanner";
import { isAdmin } from "@/server/auth";

export const metadata: Metadata = { title: "Porta", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Porta() {
  if (!(await isAdmin())) redirect("/admin/login?next=/admin/porta");
  return <DoorScanner />;
}
