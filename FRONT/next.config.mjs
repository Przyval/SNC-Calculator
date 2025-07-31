/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  basePath: '/dashboard',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
