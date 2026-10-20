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
  tagline: "A noite mais assombrada do ano tem nome.",
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
    "Para entrar, garanta antes: faça o Pix, mande o comprovante e a sua entrada chega por e-mail, com um QR Code para mostrar na porta.",
  ],
  highlights: [
    { title: "Concurso de fantasia", text: "Capricha no visual. Vai ter concurso, e a concorrência promete." },
    { title: "Lista na porta", text: "Sua entrada chega por e-mail com um QR Code. É só mostrar na chegada." },
    { title: "Pix direto", text: "Sem site de ingresso no meio e sem taxa de conveniência." },
  ],
};
