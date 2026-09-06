import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "../env";
import { ffmpegBinary, ffprobeBinary } from "./binaries";

const run = promisify(execFile);

async function tmpDir(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), `brain-${prefix}-`));
}

export async function hasBinary(bin: string): Promise<boolean> {
  try {
    await run(bin, ["-version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export type ProbeInfo = { durationSeconds: number | null; width: number | null; height: number | null; hasAudio: boolean };

export async function probeMedia(file: string): Promise<ProbeInfo> {
  try {
    const ffprobe = await ffprobeBinary();
    if (!ffprobe) throw new Error("ffprobe unavailable");
    const { stdout } = await run(ffprobe, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      file,
    ]);
    const json = JSON.parse(stdout) as {
      format?: { duration?: string };
      streams?: { codec_type?: string; width?: number; height?: number }[];
    };
    const video = json.streams?.find((s) => s.codec_type === "video");
    return {
      durationSeconds: json.format?.duration ? Math.round(Number(json.format.duration)) : null,
      width: video?.width ?? null,
      height: video?.height ?? null,
      hasAudio: Boolean(json.streams?.some((s) => s.codec_type === "audio")),
    };
  } catch {
    return { durationSeconds: null, width: null, height: null, hasAudio: true };
  }
}

/**
 * Extracts up to `count` frames evenly spread across the video as JPEG (max 768px wide).
 * Returns buffers in chronological order.
 */
export async function extractFrames(videoFile: string, durationSeconds: number | null, count = 8): Promise<Buffer[]> {
  const ffmpeg = await ffmpegBinary();
  if (!ffmpeg) return [];
  const dir = await tmpDir("frames");
  try {
    const frames: Buffer[] = [];
    const duration = durationSeconds && durationSeconds > 1 ? durationSeconds : null;
    if (duration) {
      const n = Math.min(count, Math.max(2, Math.floor(duration)));
      for (let i = 0; i < n; i++) {
        const t = ((i + 0.5) / n) * duration;
        const out = path.join(dir, `f${String(i).padStart(2, "0")}.jpg`);
        try {
          await run(ffmpeg, ["-y", "-ss", t.toFixed(2), "-i", videoFile, "-frames:v", "1", "-vf", "scale='min(768,iw)':-2", "-q:v", "4", out], { timeout: 60000 });
          frames.push(await fs.readFile(out));
        } catch {
          /* skip broken seek */
        }
      }
    } else {
      // Unknown duration: sample one frame per second up to `count`.
      await run(ffmpeg, ["-y", "-i", videoFile, "-vf", "fps=1,scale='min(768,iw)':-2", "-frames:v", String(count), "-q:v", "4", path.join(dir, "f%02d.jpg")], { timeout: 120000 });
      for (const f of (await fs.readdir(dir)).sort()) frames.push(await fs.readFile(path.join(dir, f)));
    }
    return frames;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

/** Extracts the audio track as mono 16 kHz MP3 (small enough for speech-to-text APIs). */
export async function extractAudio(mediaFile: string): Promise<Buffer | null> {
  const ffmpeg = await ffmpegBinary();
  if (!ffmpeg) return null;
  const dir = await tmpDir("audio");
  try {
    const out = path.join(dir, "audio.mp3");
    await run(ffmpeg, ["-y", "-i", mediaFile, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", out], { timeout: 300000 });
    const buf = await fs.readFile(out);
    return buf.length > 1000 ? buf : null;
  } catch {
    return null;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

/** Downloads media from a social platform with yt-dlp when the operator has enabled it. */
export async function fetchMediaWithYtDlp(url: string): Promise<{ data: Buffer; mime: string } | null> {
  if (env.connectors.mediaFetcher !== "yt-dlp") return null;
  const dir = await tmpDir("ytdlp");
  try {
    const out = path.join(dir, "media.%(ext)s");
    await run(
      env.connectors.ytDlpPath,
      ["--no-playlist", "--max-filesize", "500m", "-f", "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/b", "--merge-output-format", "mp4", "-o", out, url],
      { timeout: 600000, maxBuffer: 10 * 1024 * 1024 },
    );
    const files = await fs.readdir(dir);
    const file = files.find((f) => f.startsWith("media."));
    if (!file) return null;
    const ext = path.extname(file).slice(1).toLowerCase();
    const mime = ext === "mp4" ? "video/mp4" : ext === "webm" ? "video/webm" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : "application/octet-stream";
    return { data: await fs.readFile(path.join(dir, file)), mime };
  } catch (err) {
    console.warn("[media] yt-dlp failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export async function withTempFile<T>(data: Buffer, ext: string, fn: (file: string) => Promise<T>): Promise<T> {
  const dir = await tmpDir("file");
  const file = path.join(dir, `media.${ext}`);
  try {
    await fs.writeFile(file, data);
    return await fn(file);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export async function downloadFile(url: string, maxBytes = 300 * 1024 * 1024): Promise<{ data: Buffer; mime: string } | null> {
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "HenriqueBrain/0.1" } });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > maxBytes) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes) return null;
    const mime = (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0].trim();
    return { data: buf, mime };
  } catch {
    return null;
  }
}
