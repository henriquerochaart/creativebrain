import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { currentUser, signupsOpen } from "@/server/accounts";
import { dict } from "@/server/lang";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { d } = await dict();
  const { next = "/" } = await searchParams;
  if (await currentUser()) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
  const signup = await signupsOpen();
  return (
    <AuthCard pose="oculos" title={d.auth.login}>
      <AuthForm mode="login" next={next} />
      {signup && (
        <Link href={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="mt-3 inline-flex h-11 items-center text-[17px] text-accent-ink">
          {d.auth.register}
        </Link>
      )}
    </AuthCard>
  );
}
