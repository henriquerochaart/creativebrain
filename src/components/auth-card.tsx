import { cn } from "@/lib/utils";
import { Mascot, type MascotPose } from "./mascot";

/**
 * Login and Register: the form in a rounded window over a soft pink wash (`.auth-backdrop`),
 * everything aligned left. Brain stands behind the window, centred and as wide as its button, so
 * only his top shows above it: raised hands on Register, sunglasses on Login. `peek` is how much
 * of him the window hides, as a share of his width (the art is square).
 */
export function AuthCard({ pose, title, peek = 0.46, children }: { pose: MascotPose; title: string; peek?: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col justify-center px-5 py-10">
      {/* Fixed and full bleed, under everything; a negative z-index would sink below the body's own background. */}
      <div aria-hidden className="auth-backdrop pointer-events-none fixed inset-0 z-0" />
      <div className="relative z-10">
        <div className={cn("relative z-0 mx-6 sm:mx-8")} style={{ marginBottom: `calc(${-peek} * (100% - 3rem))` }}>
          <Mascot pose={pose} className="block h-auto w-full" />
        </div>
        <section className="relative z-10 rounded-[32px] bg-surface p-6 shadow-[var(--card-shadow)] sm:p-8">
          <h1 className="large-title">{title}</h1>
          {children}
        </section>
      </div>
    </div>
  );
}
