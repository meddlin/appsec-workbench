import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@github-inventory/db"],
};

export default nextConfig;
