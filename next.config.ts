import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable static export for Capacitor
  output: 'export',
  trailingSlash: true,
  // Ensure file tracing resolves from this project root
  outputFileTracingRoot: path.join(__dirname),
  // Ignore ESLint errors during production builds to unblock compilation
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "vvuvuibcmvqxtvdadwne.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
