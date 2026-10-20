import { event } from "@/config/event";

/** What a guest's WhatsApp invite says before the link. Only facts from config/event.ts. */
export function inviteMessage(): string {
  const when = [event.date?.replace(/^\w+, /, ""), event.time].filter(Boolean).join(", ");
  const extras = [event.openBar ? "open bar" : null, "música do funk ao darkwave", "concurso de fantasia"].filter(Boolean).join(", ");
  // The guest's own voice on WhatsApp, so informal on purpose.
  return `Bora pra ${event.name}?${when ? ` ${when}.` : ""} Tem ${extras}. Garante a sua pelo meu link:`;
}
