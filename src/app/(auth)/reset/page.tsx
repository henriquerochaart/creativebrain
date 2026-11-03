import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ResetForm } from "@/components/auth-form";
import { readResetToken } from "@/lib/session";
import { passwordHashOf, userById } from "@/server/accounts";
import { dict } from "@/server/lang";

/** Opened from a reset link. A stale or used link says so before anyone types a password. */
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { d } = await dict();
  const { token = "" } = await searchParams;
  const userId = await readResetToken(token, passwordHashOf);
  const user = userId ? await userById(userId) : null;
  return (
    <AuthCard pose={user ? "feliz" : "desconfiado"} title={d.auth.newPassword}>
      {user ? (
        <ResetForm token={token} email={user.email} />
      ) : (
        <>
          <p role="alert" className="mt-4 text-[17px] text-ink">
            {d.auth.errors.expired}
          </p>
          <Link href="/forgot" className="btn-filled mt-6 flex h-14 w-full items-center justify-center text-[17px]">
            {d.auth.anotherLink}
          </Link>
        </>
      )}
    </AuthCard>
  );
}
