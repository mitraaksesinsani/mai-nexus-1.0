import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Some next.js versions require it here
  },
  // In latest next.js, allowedDevOrigins is top level
  allowedDevOrigins: [
    '192.168.1.7',
    '192.168.1.7:3001',
    '192.168.1.*',
    '192.168.1.29',
    '192.168.1.33',
    '192.168.1.18',
    'localhost',
    'localhost:3001',
    '127.0.0.1',
  ],
};

export default nextConfig;
