import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { ForgotForm } from "@/components/auth-form";
import { RESET_MINUTES } from "@/lib/session";
import { currentUser } from "@/server/accounts";
import { dict } from "@/server/lang";

export default async function ForgotPage() {
  const { d } = await dict();
  if (await currentUser()) redirect("/");
  return (
    <AuthCard pose="pensando" title={d.auth.forgot}>
      <ForgotForm minutes={RESET_MINUTES} />
    </AuthCard>
  );
}
