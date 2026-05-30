import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["10.236.175.21", "*"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["pdfjs-dist", "bcryptjs", "pdf-parse", "mammoth"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;