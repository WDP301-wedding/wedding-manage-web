import type { NextConfig } from 'next';

const backendOrigin = process.env.BACKEND_ORIGIN || 'https://wedding-be-render-trial.onrender.com';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Socket.IO connects directly to the backend, independently of HTTP rewrites.
  env: {
    NEXT_PUBLIC_REALTIME_URL:
      process.env.NEXT_PUBLIC_REALTIME_URL || (backendOrigin ? new URL(backendOrigin).origin : ''),
  },
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
