import type { NextConfig } from "next";
import { normalizeBasePath } from "./src/lib/base-path";

/** Set BASE_PATH=/brain to serve the app from a sub path of an existing domain. Empty = domain root. */
const basePath = normalizeBasePath(process.env.BASE_PATH);

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // Inlined so client components can prefix the paths they build by hand (fetch, service worker).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  serverExternalPackages: ["pg", "pg-boss", "unpdf", "@napi-rs/canvas", "@anthropic-ai/sdk", "openai", "@google/genai"],
  images: {
    // Thumbnails are served from our own storage route or remote CDNs; we render plain <img>.
    unoptimized: true,
  },
  experimental: {
    serverActions: { bodySizeLimit: "200mb" },
  },
};

export default nextConfig;
