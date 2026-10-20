import type { Metadata, Viewport } from "next";
import { Libre_Caslon_Text } from "next/font/google";
import localFont from "next/font/local";
import { event } from "@/config/event";
import "./globals.css";

// The poster's footer face. Not in next/font's Google list, so it is self-hosted (OFL, see src/fonts).
const caslonCondensed = localFont({
  src: "../fonts/libre-caslon-condensed-latin.woff2",
  weight: "400 700",
  variable: "--font-caslon-condensed",
  display: "swap",
});
const caslon = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-caslon",
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
    <html lang="pt-BR" className={`${caslonCondensed.variable} ${caslon.variable}`}>
      <body>{children}</body>
    </html>
  );
}
