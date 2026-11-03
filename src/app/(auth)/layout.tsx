/** Welcome, Login and Register: full screen, no tab bar or sidebar. Each screen sets its own width. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-[100dvh] w-full flex-col">{children}</main>;
}
