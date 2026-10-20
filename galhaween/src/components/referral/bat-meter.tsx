import { Bat } from "../bat";

/**
 * The referral goal as bats: one lights up red for each guest brought in. With `demo`, they light
 * up one after another on a loop, to show how it works.
 */
export function BatMeter({
  count,
  goal,
  demo = false,
  scroll = false,
  size = 34,
}: {
  count: number;
  goal: number;
  demo?: boolean;
  /** Desktop scenes: light up with the scroll (falls back to the demo loop elsewhere). */
  scroll?: boolean;
  size?: number;
}) {
  return (
    <ol className="mx-auto grid w-fit grid-cols-5 gap-x-3 gap-y-4" aria-label={`${Math.min(count, goal)} de ${goal} morcegos`}>
      {Array.from({ length: goal }, (_, i) => {
        const lit = i < count;
        return (
          <li key={i} className="flex justify-center">
            <span
              className={`bat-slot ${scroll ? "is-scroll" : demo ? "is-demo" : lit ? "is-lit" : ""}`}
              style={
                scroll
                  ? ({ animationDelay: `${i * 0.35}s`, "--from": 0.12 + i * 0.055 } as React.CSSProperties)
                  : demo
                    ? { animationDelay: `${i * 0.35}s` }
                    : undefined
              }
            >
              <Bat width={size} className="bat-still" />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
