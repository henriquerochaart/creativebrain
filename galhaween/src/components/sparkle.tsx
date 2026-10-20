/** The poster's four-point star: long thin rays, twinkling unless told to hold still. */
export function Sparkle({
  className,
  size = 18,
  twinkle = 3.2,
  delay = 0,
  still = false,
}: {
  className?: string;
  size?: number;
  twinkle?: number;
  delay?: number;
  still?: boolean;
}) {
  const style = { "--twinkle": `${twinkle}s`, "--twinkle-delay": `${delay}s` } as React.CSSProperties;
  return (
    <svg
      viewBox="0 0 24 32"
      width={(size * 24) / 32}
      height={size}
      className={`${still ? "" : "sparkle"} shrink-0 ${className ?? ""}`}
      style={still ? undefined : style}
      aria-hidden
    >
      <path d="M12 0c.8 11 2 14.5 12 16-10 1.5-11.2 5-12 16-.8-11-2-14.5-12-16 10-1.5 11.2-5 12-16z" fill="currentColor" />
    </svg>
  );
}

/** "✦ Concurso de fantasia ✦": red condensed caps between two bone sparkles, as on the poster. */
export function SparkleHeading({
  children,
  as: Tag = "p",
  className,
}: {
  children: React.ReactNode;
  as?: "p" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag
      className={`flex items-center justify-center gap-3 font-display text-xl leading-none tracking-[0.02em] text-blood-2 uppercase sm:text-2xl ${className ?? ""}`}
    >
      <Sparkle className="text-bone" size={20} />
      <span>{children}</span>
      <Sparkle className="text-bone" size={20} delay={1.6} />
    </Tag>
  );
}
