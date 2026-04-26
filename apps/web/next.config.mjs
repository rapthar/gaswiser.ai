/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@gaswiser/api-client'],
  images: {
    remotePatterns: [{ hostname: 'oeccfmjiqlekufnntgrw.supabase.co' }],
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', '65.109.129.70:3000'] },
  },
};

export default nextConfig;
