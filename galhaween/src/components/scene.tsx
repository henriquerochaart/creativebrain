/**
 * A pinned scene on desktop: the section is `len` screens tall and its content stays fixed on
 * screen while you scroll through it, so things surface and move instead of scrolling past.
 * SceneDriver feeds each scene its progress as --p (0 → 1). On phones, without JavaScript or with
 * Reduce Motion it is an ordinary section.
 */
export function Scene({
  id,
  len = 2,
  className,
  innerClassName,
  children,
}: {
  id?: string;
  len?: number;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} data-scene className={`scene relative ${className ?? ""}`} style={{ "--len": len } as React.CSSProperties}>
      <div className={`scene-inner ${innerClassName ?? ""}`}>{children}</div>
    </section>
  );
}

/** Inline style for an element that surfaces during its scene: when, how long, from where. */
export function appear(from: number, span = 0.18, dy = 56, dx = 0): React.CSSProperties {
  return { "--from": from, "--span": span, "--dy": `${dy}px`, "--dx": `${dx}px` } as React.CSSProperties;
}

/** Inline style for parallax depth: larger moves further across the scene. */
export function depth(px: number): React.CSSProperties {
  return { "--depth": `${px}px` } as React.CSSProperties;
}
