import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@aws-sdk/core",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner"
  ],

  // Prevent Next.js from trying to bundle large server-only / native packages.
  // These are used exclusively in API routes and should be loaded from node_modules at runtime.
  serverExternalPackages: [
    "puppeteer-core",
    "puppeteer",
    "@sparticuz/chromium",
    "playwright",
    "playwright-core",
    "better-sqlite3",
    "nodemailer",
    "@blocknote/xl-pdf-exporter",
    "cheerio",
  ],

  // Tree-shake large client-side packages so only imported icons/components are compiled
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@blocknote/react",
      "@blocknote/core",
      "@blocknote/mantine",
    ],
  },
};

export default nextConfig;
