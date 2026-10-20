/**
 * Everything the public pages say about the party, taken from the official poster (30 outubro,
 * 21h, Rua Luiz Galhanone 275, Pix R$ 25, concurso de fantasia). Fields left as null render as
 * "em breve" or are left out, so the site never shows something nobody confirmed. The Pix key is
 * not here on purpose: it comes from the environment (PIX_KEY, PIX_NAME, PIX_CITY) so a phone
 * number stays out of git.
 */
export const event = {
  name: "Galhaween",
  /** Ticket price in reais. It goes into the Pix QR Code, so the payer's bank fills it in. */
  price: 25,
  /** 30/10/2026 is a Friday. */
  date: "Sexta, 30 de outubro" as string | null,
  /** Short forms for the poster strip at the top of the landing page. */
  dateShort: "30 outubro" as string | null,
  time: "21h" as string | null,
  /** e.g. "Casa da Galha". The poster gives only the address. */
  venue: null as string | null,
  /** Street address; the page links it to Google Maps. Add neighbourhood and city to make that link exact. */
  address: "Rua Luiz Galhanone, 275" as string | null,
  /** Where guests ask questions, e.g. { label: "@galhaween", href: "https://instagram.com/galhaween" }. */
  contact: null as { label: string; href: string } | null,
  about: [
    "A Galhaween é a nossa noite de Halloween. Luz baixa, gente fantasiada e aquele frio na espinha que ninguém sabe explicar.",
    "Open bar, música do funk ao darkwave e um concurso de fantasia. O resto, só indo para ver.",
  ],
  openBar: true,
  /** The rooms and what plays in each, main room first. */
  stages: [
    { name: "Sala", sound: "Funk, brasilidades e groove" },
    { name: "Caverna", sound: "Darkwave, post punk e techno" },
  ],
  /**
   * Behind "Ver bebidas". Until `revealed` is true the bar shows only blurred silhouettes in each
   * drink's shape; the names never leave the server.
   */
  bar: {
    revealed: false,
    drinks: [
      { name: "Absolut", shape: "vodka" },
      { name: "Gin Tanqueray", shape: "gin" },
      { name: "Red Bull", shape: "can-slim" },
      { name: "Xeque Mate", shape: "can" },
    ] as { name: string; shape: "vodka" | "gin" | "can-slim" | "can" }[],
  },
  /** Bring this many guests whose Pix is confirmed and your own entry is free. */
  referralGoal: 10,
  highlights: [
    { title: "Concurso de fantasia", text: "Capriche no visual: tem concurso, e a concorrência promete." },
    { title: "Lista na porta", text: "A entrada chega por e-mail com um QR Code. Mostre na porta e pronto." },
    { title: "Pix direto", text: "Sem site de ingresso no meio e sem taxa de conveniência." },
  ],
};
