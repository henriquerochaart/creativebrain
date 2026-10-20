import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond } from "next/font/google";
import { event } from "@/config/event";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "600", "700", "900"], variable: "--font-cinzel" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const summary = [event.dateShort && event.time ? `${event.dateShort}, ${event.time}` : null, event.address, `Pix R$ ${event.price}`]
  .filter(Boolean)
  .join(" · ");

// The share image is app/opengraph-image.jpg (logo and footer strip from the poster). Links in
// WhatsApp previews need an absolute base: SITE_URL when set, Vercel's own URL otherwise.
export const metadata: Metadata = {
  ...(process.env.SITE_URL ? { metadataBase: new URL(process.env.SITE_URL) } : {}),
  title: { default: event.name, template: `%s · ${event.name}` },
  description: `${summary}. Garanta sua entrada.`,
  openGraph: { title: event.name, description: `${summary}. Garanta sua entrada.`, locale: "pt_BR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#0a0705", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cinzel.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
