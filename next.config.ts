import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "luxeria.in",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
  allowedDevOrigins: ['192.168.1.9'],
};

export default nextConfig;
