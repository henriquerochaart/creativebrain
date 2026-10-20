import { event } from "@/config/event";

/** What a guest's WhatsApp invite says before the link. Only facts from config/event.ts. */
export function inviteMessage(): string {
  const when = [event.dateShort, event.time].filter(Boolean).join(", ");
  const extras = [event.openBar ? "open bar" : null, event.stages.length ? `${event.stages.length} palcos` : null].filter(Boolean).join(" e ");
  return `Bora pra ${event.name}?${when ? ` ${when}` : ""}${extras ? `, ${extras}` : ""}. Garante a sua pelo meu link:`;
}
