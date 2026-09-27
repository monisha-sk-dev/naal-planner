import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // compile the shared TypeScript package from the monorepo
  transpilePackages: ["@naal/shared"],
};

export default nextConfig;
