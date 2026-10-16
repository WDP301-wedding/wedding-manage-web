import type { NextConfig } from 'next';

const backendOrigin =
  process.env.BACKEND_ORIGIN || 'https://wedding-be-production-e1dc.up.railway.app';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
