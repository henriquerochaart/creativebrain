import Link from "next/link";
import { redirect } from "next/navigation";
import { Mascot } from "@/components/mascot";
import { AuthForm } from "@/components/auth-form";
import { currentUser, hasOwner } from "@/server/accounts";
import { dict } from "@/server/lang";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { d } = await dict();
  const { next = "/" } = await searchParams;
  if (await currentUser()) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
  const owner = await hasOwner();
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <Mascot pose="oculos" className="h-28 w-28" />
      <h1 className="large-title mt-4 text-center">{d.auth.login}</h1>
      <AuthForm mode="login" next={next} />
      {/* Before anyone owns the Brain there is nobody to sign in as: the way in is creating the account. */}
      {!owner && (
        <Link href={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="mt-4 inline-flex h-11 items-center text-[17px] text-accent-ink">
          {d.auth.register}
        </Link>
      )}
    </div>
  );
}
