import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { currentUser, signupsOpen } from "@/server/accounts";
import { dict } from "@/server/lang";

/** Open while BRAIN_SIGNUPS allows new accounts (the first account always); otherwise this is Login. */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { d } = await dict();
  const { next = "/" } = await searchParams;
  if (await currentUser()) redirect("/");
  if (!(await signupsOpen())) redirect(`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`);
  return (
    <AuthCard pose="feliz" title={d.auth.register}>
      <AuthForm mode="register" next={next} />
    </AuthCard>
  );
}
