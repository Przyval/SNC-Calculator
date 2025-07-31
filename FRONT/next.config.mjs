/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  basePath: '/',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
