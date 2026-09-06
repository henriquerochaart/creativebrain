import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { TopBar } from "@/components/top-bar";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "Henrique Brain",
  description: "A multimodal creative memory. Capture → Understand → Classify → Connect → Remember → Retrieve.",
};

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
