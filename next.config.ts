import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Anchor Turbopack to the project root (use cwd so config resolution matches Vercel builds).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
