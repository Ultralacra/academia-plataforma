/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["mammoth", "pdf-parse"],
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
}

export default nextConfig
