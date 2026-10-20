import { BloodLink } from "@/components/blood-button";
import { NightSky } from "@/components/night-sky";

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <NightSky />
      <div className="relative z-10">
        <p className="font-display text-7xl text-blood">404</p>
        <h1 className="section-title mt-4">Esta página virou fantasma</h1>
        <p className="mt-4 text-xl text-bone-2 italic">Ou nunca existiu. Difícil saber, no escuro.</p>
        <div className="mt-10">
          <BloodLink href="/">Voltar para a festa</BloodLink>
        </div>
      </div>
    </main>
  );
}
