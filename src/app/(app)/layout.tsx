import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { SectionBack } from "@/components/section-back";
import { AddFromQuery, AddProvider } from "@/components/add-sheet";
import { TabBar } from "@/components/tab-bar";
import { TabBarWithCounts } from "@/components/tab-bar-counts";
import { PullToRefresh } from "@/components/pull-to-refresh";

/**
 * The app's shell, for every screen behind the login: no header; a phone navigates with the tab
 * bar, a wide screen with the sidebar. Pulling the content down refreshes it.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
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
          <PullToRefresh>
            <SectionBack />
            {children}
          </PullToRefresh>
        </main>
      </div>
      <Suspense fallback={<TabBar failed={0} />}>
        <TabBarWithCounts />
      </Suspense>
    </AddProvider>
  );
}
