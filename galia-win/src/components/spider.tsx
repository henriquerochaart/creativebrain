/** Drops in on a thread, dangles, and climbs back up when touched. */
export function Spider({ className, thread = 120 }: { className?: string; thread?: number }) {
  return (
    <div className={`spider ${className ?? ""}`} aria-hidden>
      <div className="spider-drop">
        <div className="spider-thread" style={{ height: thread }} />
        <svg viewBox="0 0 40 36" width={34} height={30} className="spider-body -mt-1 text-crypt-2">
          <g stroke="var(--color-bone-3)" strokeOpacity={0.55} strokeWidth={1.6} fill="none" strokeLinecap="round">
            <path d="M16 15 9 8 3 10M16 18 7 16 2 20M16 21 8 24 4 31M17 23 12 29 11 35" />
            <path d="M24 15 31 8 37 10M24 18 33 16 38 20M24 21 32 24 36 31M23 23 28 29 29 35" />
          </g>
          <g fill="currentColor" stroke="var(--color-bone-3)" strokeOpacity={0.55} strokeWidth={0.8}>
            <ellipse cx={20} cy={22} rx={6.5} ry={7.5} />
            <circle cx={20} cy={13} r={4} />
          </g>
          <circle cx={18.4} cy={12.6} r={0.9} fill="var(--color-blood-2)" />
          <circle cx={21.6} cy={12.6} r={0.9} fill="var(--color-blood-2)" />
          <path d="M20 18.5 21.6 21.5 20 25 18.4 21.5z" fill="var(--color-blood)" opacity={0.8} />
        </svg>
      </div>
    </div>
  );
}
