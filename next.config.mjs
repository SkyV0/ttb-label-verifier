import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Parent directory has a stray package-lock.json that Next would otherwise
  // mis-identify as the workspace root. Pin to this directory.
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
