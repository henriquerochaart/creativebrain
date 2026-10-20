import Image from "next/image";
import logo from "../../../public/logo.png";

/**
 * The entry screen, on every arrival: the logo surfacing out of the dark from top to bottom, then
 * the curtain lifts. Pure CSS (see .loader in globals.css), so it is in the first paint, needs no
 * JavaScript and cannot get stuck; client-side navigation does not show it again.
 */
export function Loader({ name }: { name: string }) {
  return (
    <div className="loader" aria-hidden>
      <Image src={logo} alt={name} priority sizes="(max-width: 640px) 78vw, 420px" className="loader-logo" />
    </div>
  );
}
