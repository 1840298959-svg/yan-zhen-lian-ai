import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.YZL_DESKTOP_BUILD === "1" ? {
    output: "standalone",
    distDir: ".next-desktop",
  } : {}),
  experimental: {
    serverActions: { bodySizeLimit: "11mb" },
    cpus: 1,
  },
  webpack(config) {
    config.module.rules.unshift({
      test: /[\\/]src[\\/]app[\\/]globals\.css$/,
      enforce: "pre",
      use: "@tailwindcss/turbopack",
    });
    return config;
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
