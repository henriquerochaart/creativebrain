/** Jack-o'-lantern from the poster's footer; its face flickers like a candle inside. */
export function Pumpkin({ className, size = 34 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 40 36" width={size} height={(size * 36) / 40} className={`pumpkin ${className ?? ""}`} aria-hidden>
      <path d="M19 7c0-3 1-5 4-6l1 2c-2 1-3 2-3 4z" fill="var(--color-blood)" />
      <path
        d="M20 8c-3-2-7-2-10 0-6-1-9 5-9 12s4 14 10 13c3 2 6 2 9 1 3 1 6 1 9-1 6 1 10-6 10-13S36 7 30 8c-3-2-7-2-10 0z"
        fill="var(--color-blood)"
      />
      <g className="pumpkin-face" fill="var(--color-night)">
        <path d="m9 16 5-4 2 6zM31 16l-5-4-2 6zM18 21l2-3 2 3z" />
        <path d="M8 24c3 3 8 5 12 5s9-2 12-5l-3 1-1 2-2-2-3 2-3-2-3 2-3-2-2 2-1-2z" />
      </g>
    </svg>
  );
}
