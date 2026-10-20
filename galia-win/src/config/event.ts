/**
 * Everything the public pages say about the party. Fields left as null render as "em breve", so the
 * site never shows a date, place or time nobody confirmed. The Pix key is not here on purpose: it
 * comes from the environment (PIX_KEY, PIX_NAME, PIX_CITY) so a phone number stays out of git.
 */
export const event = {
  name: "Galia Win",
  /** Ticket price in reais. It goes into the Pix QR Code, so the payer's bank fills it in. */
  price: 25,
  tagline: "A noite mais assombrada do ano tem nome.",
  /** e.g. "Sábado, 31 de outubro" */
  date: null as string | null,
  /** e.g. "A partir das 22h" */
  time: null as string | null,
  /** e.g. "Casa da Galia" */
  venue: null as string | null,
  /** Full street address; when set, the page links it to Google Maps. */
  address: null as string | null,
  /** Where guests ask questions, e.g. { label: "@galiawin", href: "https://instagram.com/galiawin" }. */
  contact: null as { label: string; href: string } | null,
  about: [
    "A Galia Win é a nossa noite de Halloween. Luz baixa, gente fantasiada e aquele frio na espinha que ninguém sabe explicar.",
    "Para entrar, garanta antes: faça o Pix, mande o comprovante e a sua entrada chega por e-mail, com um QR Code para mostrar na porta.",
  ],
  highlights: [
    { title: "Fantasia", text: "Venha caracterizado. Quanto mais assustador, melhor." },
    { title: "Lista na porta", text: "Sua entrada chega por e-mail com um QR Code. É só mostrar na chegada." },
    { title: "Pix direto", text: "Sem site de ingresso no meio e sem taxa de conveniência." },
  ],
};
