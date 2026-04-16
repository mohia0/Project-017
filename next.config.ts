import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@aws-sdk/core",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner"
  ],
};

export default nextConfig;
