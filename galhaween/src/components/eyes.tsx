/** A pair of red eyes that blinks now and then. Purely decorative. */
export function Eyes({
  className,
  size = 16,
  blink = 5,
  delay = 0,
}: {
  className?: string;
  size?: number;
  blink?: number;
  delay?: number;
}) {
  const style = { "--blink": `${blink}s`, "--blink-delay": `${delay}s` } as React.CSSProperties;
  return (
    <div className={`eyes ${className ?? ""}`} style={{ fontSize: size }} aria-hidden>
      <span className="eye" style={style} />
      <span className="eye" style={style} />
    </div>
  );
}
