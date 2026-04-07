import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Lock Turbopack resolution to this app folder (not a parent path or accidental cwd).
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
