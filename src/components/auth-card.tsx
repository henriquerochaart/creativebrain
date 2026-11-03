import { Mascot, type MascotPose } from "./mascot";

/**
 * Transparent space under Brain's feet in each pose, as a share of the image (the art is square,
 * 512px): measured from the alpha, so every pose stands on the card the same way.
 */
const UNDER_FEET: Partial<Record<MascotPose, number>> = {
  oculos: 0.016,
  feliz: 0.07,
  pensando: 0.002,
  desconfiado: 0.002,
  apontando: 0.082,
};
/** How far his feet come down over the card's top edge, like a bird on a branch. */
const ON_EDGE = 0.035;

/**
 * Login, Register and the password screens.
 * Phone: a flat pink tint, and Brain, whole, standing on the top edge of the white card that holds
 * the form, his feet just over it. Desktop (lg): the screen split in half, Brain large in a rounded
 * pink panel on the left and the form on the right, on the page itself.
 */
export function AuthCard({ pose, title, children }: { pose: MascotPose; title: string; children: React.ReactNode }) {
  const drop = (UNDER_FEET[pose] ?? 0.05) + ON_EDGE;
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-2">
      {/* Fixed and full bleed, under everything; a negative z-index would sink below the body's own background. */}
      <div aria-hidden className="auth-tint pointer-events-none fixed inset-0 z-0 lg:hidden" />
      <div aria-hidden className="auth-tint m-4 hidden items-center justify-center rounded-[32px] lg:flex">
        <Mascot pose={pose} className="h-auto w-[min(70%,560px)]" />
      </div>
      <div className="relative z-10 flex flex-1 flex-col justify-center px-5 py-10 lg:px-12">
        <div className="mx-auto w-full max-w-md lg:max-w-[400px]">
          {/* margin-bottom in % is a share of the column's width, as is his own size. */}
          <div className="relative z-20 mx-auto w-[56%] max-w-[240px] lg:hidden" style={{ marginBottom: `calc(${-drop} * min(56%, 240px))` }}>
            <Mascot pose={pose} className="block h-auto w-full" />
          </div>
          <section className="relative z-10 rounded-[32px] bg-surface p-6 pt-8 shadow-[var(--card-shadow)] sm:p-8 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
            <h1 className="large-title lg:text-[48px] lg:leading-[1.1]">{title}</h1>
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
