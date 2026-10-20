import Link from "next/link";

function Drips() {
  return (
    <span className="drips" aria-hidden>
      <span className="drip" />
      <span className="drip" />
      <span className="drip" />
    </span>
  );
}

export function BloodLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`btn-blood ${className ?? ""}`}>
      {children}
      <Drips />
    </Link>
  );
}

export function BloodButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`btn-blood ${className ?? ""}`}>
      {children}
      <Drips />
    </button>
  );
}
