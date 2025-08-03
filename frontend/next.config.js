/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  },
  // SABİT PORT - Development için 3000
  experimental: {
    serverComponentsExternalPackages: []
  }
}

module.exports = nextConfig

module.exports = nextConfig 