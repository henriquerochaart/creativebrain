import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { SectionBack } from "@/components/section-back";
import { LangProvider } from "@/components/lang-provider";
import { AddFromQuery, AddProvider } from "@/components/add-sheet";
import { TabBar } from "@/components/tab-bar";
import { TabBarWithCounts } from "@/components/tab-bar-counts";
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
    // Next emits only the generic mobile-web-app-capable; older iOS needs Apple's own name to open
    // the Home Screen app full screen, without Safari's bars. Newer iOS reads the manifest.
    other: { "apple-mobile-web-app-capable": "yes" },
    // Brain in sunglasses (public/mascot/oculos), on a light pink tile for the tab and the Home Screen.
    icons: {
      icon: [
        { url: withBase("/icons/favicon-32.png"), sizes: "32x32", type: "image/png" },
        { url: withBase("/icons/favicon-64.png"), sizes: "64x64", type: "image/png" },
        { url: withBase("/icons/icon-192.png"), sizes: "192x192" },
        { url: withBase("/icons/icon-512.png"), sizes: "512x512" },
      ],
      apple: withBase("/icons/icon-180.png"),
    },
  };
}

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#000000" }] };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await dict();
  return (
    <html lang={localeOf(lang)}>
      <body className="min-h-screen">
        <LangProvider lang={lang}>
          {/* No header: a phone navigates with the tab bar, a wide screen with the sidebar. */}
          <AddProvider>
            <Suspense>
              <AddFromQuery />
            </Suspense>
            <div className="flex">
              <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-line lg:bg-paper-2/60">
                <Suspense fallback={<div className="h-full" />}>
                  <Sidebar />
                </Suspense>
              </div>
              {/* Bottom padding clears the floating tab bar on a phone. */}
              <main className="min-w-0 flex-1 px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:py-8">
                <SectionBack />
                {children}
              </main>
            </div>
            <Suspense fallback={<TabBar failed={0} />}>
              <TabBarWithCounts />
            </Suspense>
          </AddProvider>
        </LangProvider>
      </body>
    </html>
  );
}
