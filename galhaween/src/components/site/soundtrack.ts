"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SRC = "/trilha.mp3";
const VOLUME = 0.55;
const PREFERENCE = "gw_sound";

type State = "off" | "loading" | "on";

/**
 * The site's theme (public/trilha.mp3, composed for it, see scripts/compose-trilha.py), through
 * Web Audio: a gapless loop and a volume iOS lets us set. Browsers only allow sound after a tap or a
 * key, so it starts on the first one anywhere on the page, unless the guest muted it before.
 * Safari's audio session is set to "playback" so the iPhone's silent switch does not swallow it.
 */
export function useSoundtrack() {
  const [state, setState] = useState<State>("off");
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const wantedRef = useRef(false);

  const start = useCallback(async () => {
    wantedRef.current = true;
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
    // Created and resumed inside the gesture, which is what unlocks audio on iOS.
    const ctx = (ctxRef.current ??= new AudioCtx());
    if (!gainRef.current) {
      gainRef.current = ctx.createGain();
      gainRef.current.gain.value = 0;
      gainRef.current.connect(ctx.destination);
    }
    void ctx.resume();
    try {
      if (!bufferRef.current) {
        setState("loading");
        const response = await fetch(SRC);
        bufferRef.current = await ctx.decodeAudioData(await response.arrayBuffer());
      }
      if (!wantedRef.current) return;
      if (!sourceRef.current) {
        const source = ctx.createBufferSource();
        source.buffer = bufferRef.current;
        source.loop = true;
        source.connect(gainRef.current);
        source.start();
        sourceRef.current = source;
      }
      gainRef.current.gain.cancelScheduledValues(ctx.currentTime);
      gainRef.current.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.8);
      setState("on");
    } catch {
      setState("off");
    }
  }, []);

  const stop = useCallback(() => {
    wantedRef.current = false;
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    setState("off");
    if (!ctx || !gain) return;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  }, []);

  const toggle = useCallback(() => {
    if (wantedRef.current) {
      stop();
      try {
        localStorage.setItem(PREFERENCE, "off");
      } catch {}
    } else {
      try {
        localStorage.setItem(PREFERENCE, "on");
      } catch {}
      void start();
    }
  }, [start, stop]);

  // First tap or key anywhere starts the music, unless it was muted on an earlier visit. A tap on
  // the sound button itself is left to the button.
  useEffect(() => {
    let muted = false;
    try {
      muted = localStorage.getItem(PREFERENCE) === "off";
    } catch {}
    if (muted) return;
    const kick = (event: Event) => {
      if ((event.target as Element | null)?.closest?.("[data-sound-toggle]")) return;
      remove();
      void start();
    };
    const remove = () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    return remove;
  }, [start]);

  // Silence in background tabs; pick up again on return if it was playing.
  useEffect(() => {
    const onVisibility = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else if (wantedRef.current) void ctx.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return { state, toggle };
}
