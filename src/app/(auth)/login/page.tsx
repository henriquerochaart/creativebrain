import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { currentUser, hasOwner } from "@/server/accounts";
import { dict } from "@/server/lang";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { d } = await dict();
  const { next = "/" } = await searchParams;
  if (await currentUser()) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
  const owner = await hasOwner();
  return (
    <AuthCard pose="oculos" title={d.auth.login}>
      <AuthForm mode="login" next={next} />
      {/* Before anyone owns the Brain there is nobody to sign in as: the way in is creating the account. */}
      {!owner && (
        <Link href={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="mt-3 inline-flex h-11 items-center text-[17px] text-accent-ink">
          {d.auth.register}
        </Link>
      )}
    </AuthCard>
  );
}
