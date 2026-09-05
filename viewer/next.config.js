/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/admin/:path*',
        destination: 'http://py:8000/admin/:path*',
      },
    ]
  },
};

module.exports = nextConfig;
