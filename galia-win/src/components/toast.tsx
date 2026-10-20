"use client";

import { Bat } from "./bat";

/** Short confirmation that floats up from the bottom of the screen and fades. Re-keyed per use. */
export function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="toast pointer-events-none fixed bottom-8 left-1/2 z-50 flex items-center gap-2 rounded-full border border-line bg-crypt-2 px-5 py-3 text-lg text-bone shadow-2xl"
    >
      <Bat width={26} className="text-blood-2" />
      {message}
    </div>
  );
}
