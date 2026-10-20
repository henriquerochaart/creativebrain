// The server runs in UTC on most hosts; the party and its guests are in Brazil.
const TIME_ZONE = "America/Sao_Paulo";

export function brl(amount: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}

export function dateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function time(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** "Rua Luiz Galhanone, 275": keeps the number on the street's line when the text wraps. */
export function keepNumber(address: string): string {
  return address.replace(/,\s*(\d)/, ",\u00a0$1");
}
