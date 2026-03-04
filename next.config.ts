import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 제한을 10MB로 확장
    },
  },
};
export default nextConfig;

