/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  async rewrites() {
    return [
      {
        // Public clients use a stable, versioned URL while legacy /api routes
        // remain available during migration.
        source: '/api/v1/:path*',
        destination: '/api/:path*',
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig
