/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Netlify'da server-side rendering kullanacağız
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`
      }
    ]
  }
}

module.exports = nextConfig 