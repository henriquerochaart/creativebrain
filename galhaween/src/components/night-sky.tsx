import { Bat } from "./bat";

// Fixed, so the server and the browser render the same sky. Each bat crosses at its own height,
// size and pace; negative delays put some mid-flight on first paint.
const BATS = [
  { top: "14%", size: 46, duration: 19, delay: -4, bob: 1.6, opacity: 0.95 },
  { top: "26%", size: 28, duration: 27, delay: -15, bob: 2.1, opacity: 0.7 },
  { top: "9%", size: 22, duration: 33, delay: -26, bob: 1.8, opacity: 0.55 },
  { top: "38%", size: 34, duration: 23, delay: -9, bob: 2.4, opacity: 0.85 },
  { top: "19%", size: 18, duration: 41, delay: -2, bob: 1.4, opacity: 0.5 },
];

/** Bats crossing above the page content (z-20) and fog rolling along the bottom of the section. */
export function NightSky() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="fog bottom-[-6rem] left-[-20%] h-64 w-[80%]" style={{ animationDuration: "18s" }} />
      <div className="fog right-[-25%] bottom-[-8rem] h-72 w-[90%]" style={{ animationDuration: "23s", animationDelay: "-7s" }} />
      <div className="absolute inset-0 z-20">
        {BATS.map((bat, i) => (
          <div
            key={i}
            className="bat-flight"
            style={{ top: bat.top, animationDuration: `${bat.duration}s`, animationDelay: `${bat.delay}s` }}
          >
            <div className="bat-bob text-black" style={{ animationDuration: `${bat.bob}s`, opacity: bat.opacity }}>
              <Bat width={bat.size} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
