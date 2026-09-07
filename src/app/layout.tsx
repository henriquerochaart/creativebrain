import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { TopBar } from "@/components/top-bar";
import { Sidebar } from "@/components/sidebar";
import { withBase } from "@/lib/base-path";

export const metadata: Metadata = {
  title: "Henrique Brain",
  description: "A multimodal creative memory. Capture → Understand → Classify → Connect → Remember → Retrieve.",
  manifest: withBase("/manifest.webmanifest"),
  applicationName: "Henrique Brain",
  appleWebApp: { capable: true, title: "Brain", statusBarStyle: "default" },
  icons: { icon: [{ url: withBase("/icons/icon-192.png"), sizes: "192x192" }, { url: withBase("/icons/icon-512.png"), sizes: "512x512" }], apple: withBase("/icons/icon-180.png") },
};

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fbfbfa" }, { media: "(prefers-color-scheme: dark)", color: "#0f0f10" }] };

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Suspense fallback={<div className="h-16 border-b border-line" />}>
          <TopBar />
        </Suspense>
        <div className="flex">
          <Suspense fallback={<div className="hidden w-56 shrink-0 border-r border-line lg:block" />}>
            <Sidebar />
          </Suspense>
          <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
