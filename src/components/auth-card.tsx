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

/** Brain on white: the art with a soft shadow on the ground under his feet. */
function StandingBrain({ pose, className }: { pose: MascotPose; className?: string }) {
  const feet = 1 - (UNDER_FEET[pose] ?? 0.05);
  return (
    <div className={className + " relative"}>
      <div aria-hidden className="mascot-ground absolute left-[18%] w-[64%]" style={{ top: `${(feet - 0.045) * 100}%`, height: "9%" }} />
      <Mascot pose={pose} className="mascot-shadow relative block h-auto w-full" />
    </div>
  );
}

/**
 * Login, Register and the password screens.
 * Phone: a white page, and Brain, whole and with a soft shadow, standing on the top edge of the pink
 * card that holds the form, his feet just over it. Desktop (lg): the screen split in half, Brain
 * large on the white at left, the form centred in a rounded pink panel at right.
 */
export function AuthCard({ pose, title, children }: { pose: MascotPose; title: string; children: React.ReactNode }) {
  const drop = (UNDER_FEET[pose] ?? 0.05) + ON_EDGE;
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-2">
      <div aria-hidden className="hidden items-center justify-center lg:flex">
        <StandingBrain pose={pose} className="w-[min(70%,560px)]" />
      </div>
      <div className="flex flex-1 flex-col justify-center px-5 py-10 lg:p-4">
        <div className="mx-auto w-full max-w-md lg:flex lg:max-w-none lg:flex-1 lg:flex-col">
          {/* margin-bottom in % is a share of the column's width, as is his own size. */}
          <div className="relative z-20 mx-auto w-[56%] max-w-[240px] lg:hidden" style={{ marginBottom: `calc(${-drop} * min(56%, 240px))` }}>
            <StandingBrain pose={pose} />
          </div>
          <section className="auth-tint relative z-10 rounded-[32px] p-6 pt-8 sm:p-8 lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12">
            <div className="lg:mx-auto lg:w-full lg:max-w-[400px]">
              <h1 className="large-title lg:text-[48px] lg:leading-[1.1]">{title}</h1>
              {children}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
