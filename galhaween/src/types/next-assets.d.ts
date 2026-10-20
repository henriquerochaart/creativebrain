// Types for static image imports (import logo from "../public/logo.png"). Next writes the same
// reference into next-env.d.ts, but that file is generated and ignored, so a fresh clone would fail
// the typecheck until the first build.
/// <reference types="next/image-types/global" />
