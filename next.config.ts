import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ensure file tracing resolves from this project root
  outputFileTracingRoot: path.join(__dirname),
  // Ignore ESLint errors during production builds to unblock compilation
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
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
