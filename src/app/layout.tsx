import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { TopBar } from "@/components/top-bar";
import { Sidebar } from "@/components/sidebar";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { SidebarProvider } from "@/components/sidebar-provider";
import { LangProvider } from "@/components/lang-provider";
import { withBase } from "@/lib/base-path";
import { dict } from "@/server/lang";
import { localeOf } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await dict();
  return {
    title: d.app.name,
    description: d.app.description,
    manifest: withBase("/manifest.webmanifest"),
    applicationName: d.app.name,
    appleWebApp: { capable: true, title: "Brain", statusBarStyle: "default" },
    // The SVG is listed first: browsers that support it pick it and render the brain with the
    // viewer's own emoji font, sharp at any size. The PNGs stay as the fallback.
    icons: {
      icon: [
        { url: withBase("/icons/icon.svg"), type: "image/svg+xml" },
        { url: withBase("/icons/icon-192.png"), sizes: "192x192" },
        { url: withBase("/icons/icon-512.png"), sizes: "512x512" },
      ],
      apple: withBase("/icons/icon-180.png"),
    },
  };
}

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fbfbfa" }, { media: "(prefers-color-scheme: dark)", color: "#0f0f10" }] };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await dict();
  return (
    <html lang={localeOf(lang)}>
      <body className="min-h-screen">
        <LangProvider lang={lang}>
          <SidebarProvider>
            <Suspense fallback={<div className="h-16 border-b border-line" />}>
              <TopBar />
            </Suspense>
            <div className="flex">
              <SidebarDrawer>
                <Suspense fallback={<div className="h-full" />}>
                  <Sidebar />
                </Suspense>
              </SidebarDrawer>
              <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</main>
            </div>
          </SidebarProvider>
        </LangProvider>
      </body>
    </html>
  );
}
