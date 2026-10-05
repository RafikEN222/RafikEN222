import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les packages du workspace sont publiés en TypeScript source.
  transpilePackages: ["@rj/core"],
};

export default nextConfig;
