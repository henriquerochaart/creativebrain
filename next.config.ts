import type { NextConfig } from "next";
import { normalizeBasePath } from "./src/lib/base-path";

/** Set BASE_PATH=/brain to serve the app from a sub path of an existing domain. Empty = domain root. */
const basePath = normalizeBasePath(process.env.BASE_PATH);

/**
 * Security headers on every response. Thumbnails, videos and PDFs come from our storage route or
 * from the platforms' CDNs, so images, media and frames allow any https origin; scripts, styles,
 * fetches and forms stay on our own. Next inlines its bootstrap scripts, hence 'unsafe-inline'
 * (and 'unsafe-eval' only for the dev server). No one may frame the app.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self' blob: https:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Reset links carry their token in the query: other sites only ever see our origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Inlined so client components can prefix the paths they build by hand (fetch, service worker).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // ffmpeg-static and ffprobe-static locate their binary with path.join(__dirname, …). Bundling them
  // rewrites __dirname, the path stops resolving, and frame extraction fails silently — which is how
  // a video ends up with no thumbnail of its own. They have to stay external.
  serverExternalPackages: ["pg", "pg-boss", "unpdf", "@napi-rs/canvas", "ffmpeg-static", "ffprobe-static", "@anthropic-ai/sdk", "openai", "@google/genai", "undici"],
  images: {
    // Thumbnails are served from our own storage route or remote CDNs; we render plain <img>.
    unoptimized: true,
  },
  experimental: {
    // Server actions only carry sign-in forms and a share confirmation; files go to /api/upload.
    serverActions: { bodySizeLimit: "1mb" },
    // Every page is dynamic; without this the client throws each one away on leaving it, so going
    // back to a tab waited on the server again. Kept 30 s, so switching tabs is instant. Anything
    // that changes data calls router.refresh(), which clears it.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
