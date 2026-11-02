import { Mascot, type MascotPose } from "./mascot";

/**
 * Login and Register: the form in a rounded window over a soft pink wash (`.auth-backdrop`),
 * everything aligned left, Brain at the top of the window and the title under him.
 */
export function AuthCard({ pose, title, children }: { pose: MascotPose; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col justify-center px-5 py-10">
      {/* Fixed and full bleed, under the window; a negative z-index would sink below the body's own background. */}
      <div aria-hidden className="auth-backdrop pointer-events-none fixed inset-0 z-0" />
      <section className="relative z-10 rounded-[32px] bg-surface p-6 shadow-[var(--card-shadow)] sm:p-8">
        <Mascot pose={pose} className="-ml-1 h-20 w-20" />
        <h1 className="large-title mt-3">{title}</h1>
        {children}
      </section>
    </div>
  );
}
