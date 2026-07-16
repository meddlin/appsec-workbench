import { config as loadEnvConfig } from "dotenv";
import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = dirname(fileURLToPath(import.meta.url));

loadEnvConfig({ path: resolve(appDirectory, "../../.env") });

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: resolve(appDirectory, "../.."),
  transpilePackages: ["@appsec-workbench/db"],
};

export default nextConfig;
