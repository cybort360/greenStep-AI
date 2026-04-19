import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Avoid picking up a parent Desktop lockfile when tracing server files.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
