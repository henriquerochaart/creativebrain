import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { currentUser, hasOwner } from "@/server/accounts";
import { dict } from "@/server/lang";

/** Only the first account: once someone owns the Brain, this is Login (and no link to it is needed here). */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { d } = await dict();
  const { next = "/" } = await searchParams;
  if (await currentUser()) redirect("/");
  if (await hasOwner()) redirect(`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`);
  return (
    <AuthCard pose="feliz" title={d.auth.register}>
      <AuthForm mode="register" next={next} />
    </AuthCard>
  );
}
