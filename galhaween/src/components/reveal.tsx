"use client";

import { useEffect, useRef } from "react";

/**
 * Fades its children up the first time they scroll into view (phones). On desktop the scenes take
 * over: pass `appear` timing in `style` (--from, --span, --dx, --dy), see .appear in globals.css.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className ?? ""}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}
