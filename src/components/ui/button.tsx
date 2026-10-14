import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  // HIG button styles: filled (the primary action), gray (secondary, tinted label), plain, destructive.
  primary: "bg-accent text-white font-semibold hover:opacity-90 active:opacity-75",
  ghost: "bg-transparent text-accent hover:bg-fill",
  outline: "bg-fill text-accent hover:bg-fill-2",
  danger: "bg-transparent text-danger hover:bg-danger/10",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-11 px-4 text-[15px] lg:h-10 lg:text-sm",
  lg: "h-12 px-5 text-[17px]",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-35",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
