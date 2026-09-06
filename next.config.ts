import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "pg-boss", "unpdf", "@anthropic-ai/sdk", "openai", "@google/genai"],
  images: {
    // Thumbnails are served from our own storage route or remote CDNs; we render plain <img>.
    unoptimized: true,
  },
  experimental: {
    serverActions: { bodySizeLimit: "200mb" },
  },
};

export default nextConfig;
