/** A bat in silhouette. Wings rotate around the shoulders (see .bat in globals.css). */
export function Bat({ className, width = 64 }: { className?: string; width?: number }) {
  return (
    <svg viewBox="0 0 64 32" width={width} height={width / 2} className={`bat ${className ?? ""}`} aria-hidden>
      <g fill="currentColor">
        <path
          className="wing-l"
          d="M30 12C22 5 12 3 1 7c5 2 7 6 7 10 3-3 6-2 8 1 2-3 6-3 8 1 2-3 5-2 6 1z"
        />
        <path
          className="wing-r"
          d="M34 12c8-7 18-9 29-5-5 2-7 6-7 10-3-3-6-2-8 1-2-3-6-3-8 1-2-3-5-2-6 1z"
        />
        <path d="M29.2 9.2 29.6 4l1.9 2.6h1l1.9-2.6.4 5.2c.8 1.4 1 3.4.6 5.6-.5 3-1.6 5.6-3.4 7.2-1.8-1.6-2.9-4.2-3.4-7.2-.4-2.2-.2-4.2.6-5.6z" />
      </g>
    </svg>
  );
}
