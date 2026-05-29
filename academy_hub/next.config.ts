import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/hub",
  allowedDevOrigins: ["127.0.0.1:5050", "localhost:5050"],
  async redirects() {
    return [
      {
        source: "/manager",
        destination: "/coach",
        permanent: true,
      },
      {
        source: "/manager/:path*",
        destination: "/coach/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
