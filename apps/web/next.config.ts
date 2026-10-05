import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les packages du workspace sont publiés en TypeScript source.
  transpilePackages: ["@rj/core", "@rj/db"],
  // Module natif : chargé par Node, pas bundlé.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
