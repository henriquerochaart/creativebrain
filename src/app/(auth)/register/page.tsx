import { redirect } from "next/navigation";
import { Mascot } from "@/components/mascot";
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
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <Mascot pose="feliz" className="h-28 w-28" />
      <h1 className="large-title mt-4 text-center">{d.auth.register}</h1>
      <AuthForm mode="register" next={next} />
    </div>
  );
}
