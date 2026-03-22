import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: '/skill.md',
        destination: '/api/skill',
      },
    ];
  },
};

export default nextConfig;
