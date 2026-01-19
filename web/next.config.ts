import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* put any other config options here, e.g. reactStrictMode: true */

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/:path*", // FastAPI backend
      },
    ];
  },
};

export default nextConfig;
