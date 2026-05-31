import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/hub",
  allowedDevOrigins: [
    "127.0.0.1:5050",
    "localhost:5050",
    "71.251.218.101:5050",
    "71.251.218.101:3000",
  ],
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
