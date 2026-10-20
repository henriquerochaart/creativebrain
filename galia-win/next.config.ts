import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app lives inside another repository; without this Next picks the parent lockfile as the
  // workspace root and traces files from there.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  // PGlite loads its wasm and data bundle from its own package directory at runtime, so it has to
  // stay external. pg is external for the same reason the parent app keeps it so.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "nodemailer"],
};

export default nextConfig;
