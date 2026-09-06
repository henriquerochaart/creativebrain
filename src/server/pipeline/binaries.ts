import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../env";

const run = promisify(execFile);

/**
 * Resolves ffmpeg/ffprobe in this order: FFMPEG_PATH / FFPROBE_PATH env, a system binary on PATH,
 * then the static binaries shipped as optional dependencies (ffmpeg-static, ffprobe-static).
 * The static fallback is what makes video understanding work on Vercel and other serverless hosts.
 */
async function works(bin: string): Promise<boolean> {
  try {
    await run(bin, ["-version"], { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

let ffmpegResolved: string | null | undefined;
let ffprobeResolved: string | null | undefined;

export async function ffmpegBinary(): Promise<string | null> {
  if (ffmpegResolved !== undefined) return ffmpegResolved;
  const candidates = [env.connectors.ffmpegPath, "ffmpeg"].filter((c): c is string => Boolean(c));
  for (const c of candidates) if (await works(c)) return (ffmpegResolved = c);
  try {
    const mod = (await import("ffmpeg-static")) as { default?: string | null };
    if (mod.default && (await works(mod.default))) return (ffmpegResolved = mod.default);
  } catch {
    /* optional dependency not installed */
  }
  return (ffmpegResolved = null);
}

export async function ffprobeBinary(): Promise<string | null> {
  if (ffprobeResolved !== undefined) return ffprobeResolved;
  const candidates = [env.connectors.ffprobePath, "ffprobe"].filter((c): c is string => Boolean(c));
  for (const c of candidates) if (await works(c)) return (ffprobeResolved = c);
  try {
    const mod = (await import("ffprobe-static")) as { default?: { path?: string }; path?: string };
    const p = mod.default?.path ?? mod.path;
    if (p && (await works(p))) return (ffprobeResolved = p);
  } catch {
    /* optional dependency not installed */
  }
  return (ffprobeResolved = null);
}
