"use client";

import jsQR from "jsqr";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { firstName, time } from "@/lib/format";
import { Logo } from "../logo";

type Result =
  | { kind: "in"; name: string; at: string; token: string; free: boolean }
  | { kind: "already"; name: string; at: string; token: string }
  | { kind: "invalid"; name: string | null }
  | { kind: "not_ticket" }
  | { kind: "error"; message: string };

type CheckInResponse = { ok?: boolean; error?: string; result?: string; checkedInAt?: string; name?: string; token?: string; kind?: string };

const TOKEN = /\/entrada\/([A-Za-z0-9_-]{16,64})/;

/** A short tone: high for "in", low for anything else. Doubles as a cue in a loud room. */
function beep(ok: boolean) {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 1320 : 220;
    osc.type = ok ? "sine" : "square";
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (ok ? 0.25 : 0.5));
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    setTimeout(() => void ctx.close(), 800);
  } catch {}
  navigator.vibrate?.(ok ? 80 : [120, 80, 120]);
}

/**
 * The door: point the phone's camera at a ticket's QR Code and get one big answer. Decoding runs
 * in the browser with jsQR, so it works on iPhones too (Safari has no BarcodeDetector). A ticket
 * that will not scan can be checked in by its printed code.
 */
export function DoorScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef<{ text: string; at: number } | null>(null);
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "denied">("off");
  const [result, setResult] = useState<Result | null>(null);
  const [code, setCode] = useState("");
  const [count, setCount] = useState(0);

  const show = useCallback((data: CheckInResponse | null) => {
    if (!data?.ok) {
      setResult({ kind: "error", message: data?.error ?? "Sem conexão. Tente de novo." });
      beep(false);
      return;
    }
    if (data.result === "checked_in") {
      setResult({ kind: "in", name: data.name ?? "", at: data.checkedInAt ?? new Date().toISOString(), token: data.token ?? "", free: data.kind === "free" });
      setCount((n) => n + 1);
      beep(true);
    } else if (data.result === "already_checked_in") {
      setResult({ kind: "already", name: data.name ?? "", at: data.checkedInAt ?? "", token: data.token ?? "" });
      beep(false);
    } else {
      setResult({ kind: "invalid", name: data.name ?? null });
      beep(false);
    }
  }, []);

  const handle = useCallback(
    async (text: string) => {
      // The same code held in front of the camera keeps decoding; act on it once.
      const now = Date.now();
      if (lastRef.current && lastRef.current.text === text && now - lastRef.current.at < 5000) return;
      lastRef.current = { text, at: now };
      busyRef.current = true;
      const token = text.match(TOKEN)?.[1];
      if (!token) {
        setResult({ kind: "not_ticket" });
        beep(false);
        return;
      }
      const response = await fetch(`/api/admin/checkin/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => null);
      if (response?.status === 401) return void (window.location.href = "/admin/login?next=/admin/porta");
      show(((await response?.json().catch(() => null)) ?? null) as CheckInResponse | null);
    },
    [show],
  );

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamera("off");
  }, []);

  const start = useCallback(async () => {
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      video.setAttribute("playsinline", "");
      await video.play();
      setCamera("on");
    } catch {
      setCamera("denied");
    }
  }, []);

  // Decode a downscaled frame every ~150 ms while the camera is on and no answer is on screen.
  useEffect(() => {
    if (camera !== "on") return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 150 || busyRef.current) return;
      last = t;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const found = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
      if (found?.data) void handle(found.data);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [camera, handle]);

  useEffect(() => stop, [stop]);

  // A successful entry clears itself so the line keeps moving; problems wait for a tap.
  useEffect(() => {
    if (result?.kind !== "in") return;
    const timer = setTimeout(() => next(), 3500);
    return () => clearTimeout(timer);
  }, [result]);

  function next() {
    setResult(null);
    busyRef.current = false;
  }

  async function undo(token: string) {
    await fetch(`/api/admin/checkin/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ undo: true }) });
    setCount((n) => Math.max(0, n - 1));
    next();
  }

  async function submitCode() {
    if (!code.trim()) return;
    busyRef.current = true;
    const response = await fetch("/api/admin/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);
    show(((await response?.json().catch(() => null)) ?? null) as CheckInResponse | null);
    setCode("");
  }

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-md flex-col px-4 pt-4 pb-8">
      <header className="flex items-center justify-between gap-3">
        <Link href="/admin" className="flex items-baseline gap-3">
          <Logo size="sm" />
          <span className="eyebrow">Porta</span>
        </Link>
      </header>

      <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-[2px] border border-rule bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {camera === "on" && !result && (
          <div className="pointer-events-none absolute inset-[14%] border-2 border-bone/70" aria-hidden>
            <span className="scan-line" />
          </div>
        )}
        {camera !== "on" && !result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            {camera === "denied" ? (
              <p className="text-base text-bone">
                O navegador não liberou a câmera. Permita o acesso nas configurações do site e toque de novo, ou digite o código abaixo.
              </p>
            ) : (
              <p className="text-base text-bone-2">Aponte a câmera para o QR Code da entrada.</p>
            )}
            <button
              type="button"
              onClick={start}
              disabled={camera === "starting"}
              className="btn-blood w-full"
            >
              {camera === "starting" ? "Abrindo…" : "Abrir câmera"}
            </button>
          </div>
        )}
        {result && <Answer result={result} onNext={next} onUndo={undo} />}
      </div>

      <p className="mt-3 text-center text-sm text-bone-3">{count > 0 ? `${count} liberados neste aparelho` : "Cada entrada passa uma vez só."}</p>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submitCode();
        }}
      >
        <input
          className="field font-display text-xl uppercase"
          placeholder="GW-XXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Código da entrada"
        />
        <button type="submit" className="btn-ghost shrink-0">
          Conferir
        </button>
      </form>

      {camera === "on" && (
        <button type="button" onClick={stop} className="mt-6 text-sm text-bone-3 underline underline-offset-4">
          Desligar câmera
        </button>
      )}
    </main>
  );
}

function Answer({ result, onNext, onUndo }: { result: Result; onNext: () => void; onUndo: (token: string) => void }) {
  const ok = result.kind === "in";
  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center ${ok ? "bg-bone text-night" : "bg-blood text-white"}`} role="status">
      {result.kind === "in" && (
        <>
          <p className="font-display text-6xl leading-none uppercase">Liberado</p>
          <p className="text-2xl">{result.name}</p>
          {result.free && <p className="text-base">Entrada grátis por indicação</p>}
          <button type="button" className="mt-2 text-base underline underline-offset-4" onClick={() => onUndo(result.token)}>
            Desfazer
          </button>
        </>
      )}
      {result.kind === "already" && (
        <>
          <p className="font-display text-5xl leading-none uppercase">Já usada</p>
          <p className="text-xl">
            {firstName(result.name)} entrou às {time(result.at)}.
          </p>
        </>
      )}
      {result.kind === "invalid" && (
        <>
          <p className="font-display text-5xl leading-none uppercase">Não vale</p>
          <p className="text-xl">Entrada cancelada{result.name ? ` (${firstName(result.name)})` : ""}.</p>
        </>
      )}
      {result.kind === "not_ticket" && (
        <>
          <p className="font-display text-4xl leading-none uppercase">Não é entrada</p>
          <p className="text-lg">Esse QR Code não é de uma entrada da festa.</p>
        </>
      )}
      {result.kind === "error" && (
        <>
          <p className="font-display text-4xl leading-none uppercase">Não achei</p>
          <p className="text-lg">{result.message}</p>
        </>
      )}
      <button type="button" onClick={onNext} className={`mt-4 rounded-[2px] border px-6 py-3 font-display text-xl uppercase ${ok ? "border-night/40" : "border-white/60"}`}>
        Próxima
      </button>
    </div>
  );
}
