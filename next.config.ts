import type { NextConfig } from "next";
import { normalizeBasePath } from "./src/lib/base-path";

/** Set BASE_PATH=/brain to serve the app from a sub path of an existing domain. Empty = domain root. */
const basePath = normalizeBasePath(process.env.BASE_PATH);

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // Inlined so client components can prefix the paths they build by hand (fetch, service worker).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // ffmpeg-static and ffprobe-static locate their binary with path.join(__dirname, …). Bundling them
  // rewrites __dirname, the path stops resolving, and frame extraction fails silently — which is how
  // a video ends up with no thumbnail of its own. They have to stay external.
  serverExternalPackages: ["pg", "pg-boss", "unpdf", "@napi-rs/canvas", "ffmpeg-static", "ffprobe-static", "@anthropic-ai/sdk", "openai", "@google/genai"],
  images: {
    // Thumbnails are served from our own storage route or remote CDNs; we render plain <img>.
    unoptimized: true,
  },
  experimental: {
    serverActions: { bodySizeLimit: "200mb" },
  },
};

export default nextConfig;
