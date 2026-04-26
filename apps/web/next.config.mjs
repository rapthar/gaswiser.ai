/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

const nextConfig = {
  transpilePackages: ['@gaswiser/api-client'],
  images: {
    remotePatterns: [{ hostname: 'oeccfmjiqlekufnntgrw.supabase.co' }],
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', '65.109.129.70:3000'] },
  },
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${BACKEND_URL}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
