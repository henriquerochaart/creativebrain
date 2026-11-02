/** Welcome, Login and Register: full screen, no tab bar or sidebar, one column in the middle. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">{children}</main>;
}
