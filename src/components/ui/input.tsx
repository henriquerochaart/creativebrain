import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[10px] bg-fill px-3.5 text-[17px] text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent/40 lg:h-10 lg:text-[15px]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-[12px] bg-fill px-3.5 py-3 text-[17px] text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent/40 lg:text-[15px]",
        className,
      )}
      {...props}
    />
  );
}
