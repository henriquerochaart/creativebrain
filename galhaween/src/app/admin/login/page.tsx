import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/logo";
import { NightSky } from "@/components/night-sky";
import { isAdmin } from "@/server/auth";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Only same-site paths, so the login cannot be used to bounce someone to another domain.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  if (await isAdmin()) redirect(destination);
  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4">
      <NightSky />
      <div className="card relative z-10 w-full max-w-sm px-6 py-10 text-center">
        <Logo size="sm" />
        <h1 className="eyebrow mt-4">Painel da organização</h1>
        <LoginForm destination={destination} />
      </div>
    </main>
  );
}
