import type { NextConfig } from 'next';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
