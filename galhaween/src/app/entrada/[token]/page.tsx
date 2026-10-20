import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CheckIn } from "@/components/admin/check-in";
import { NightSky } from "@/components/night-sky";
import { event } from "@/config/event";
import { keepNumber, time } from "@/lib/format";
import { isAdmin } from "@/server/auth";
import { NoDatabase } from "@/components/no-database";
import { dbConfigured } from "@/server/db";
import { getStore } from "@/server/store";
import { qrSvg, ticketUrl } from "@/server/ticket";

export const metadata: Metadata = { title: "Sua entrada", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * What the QR Code opens. A guest sees their ticket; someone logged in to the panel (the door) sees
 * the same page with a button that lets the ticket in, once.
 */
export default async function Ticket({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!dbConfigured()) return <NoDatabase />;
  const entry = await (await getStore()).byToken(token);
  if (!entry || !entry.ticketCode) notFound();

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const scheme = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = process.env.SITE_URL || `${scheme}://${host}`;
  const qr = await qrSvg(ticketUrl(origin, token));
  const door = await isAdmin();
  const valid = entry.status === "approved";
  const details = [event.date, event.time, event.venue, event.address && keepNumber(event.address)].filter(Boolean) as string[];

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center overflow-x-clip px-4 pt-16 pb-16">
      <div className="absolute inset-x-0 top-0 h-96">
        <NightSky />
      </div>

      <div className="card relative z-10 mt-6 w-full max-w-sm overflow-hidden text-center">
        <div className="border-b border-dashed border-line px-6 pt-8 pb-6">
          <p className="eyebrow">Entrada</p>
          <p className="mt-2 text-2xl text-bone">{entry.name}</p>
          <p className="mt-1 font-display text-2xl tracking-[0.08em] text-blood">{entry.ticketCode}</p>
        </div>
        <div className="px-6 py-6">
          {valid ? (
            <div
              className="mx-auto w-full max-w-[16rem] overflow-hidden rounded-[2px] bg-parchment [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
              role="img"
              aria-label={`QR Code da entrada ${entry.ticketCode}`}
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          ) : (
            <p className="rounded-[2px] border border-blood/50 bg-ember/30 px-4 py-6 text-xl text-bone">Esta entrada foi cancelada.</p>
          )}
          {valid && (
            <p className="mt-4 text-base text-bone-2">
              {entry.checkedInAt ? `Usada às ${time(entry.checkedInAt)}.` : "Mostre na porta. Vale para uma pessoa, uma vez."}
            </p>
          )}
          {details.length > 0 && <p className="mt-4 text-base text-bone-2">{details.join(" · ")}</p>}
        </div>
      </div>

      {door && (
        <div className="relative z-10 mt-6 w-full max-w-sm">
          <CheckIn token={token} name={entry.name} valid={valid} checkedInAt={entry.checkedInAt} />
        </div>
      )}
    </main>
  );
}
