import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'export', // Required for Capacitor - generates static HTML/JS/CSS
  trailingSlash: true,
  // Ensure file tracing resolves from this project root
  outputFileTracingRoot: path.join(__dirname),

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
