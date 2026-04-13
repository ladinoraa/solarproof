import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@solarproof/stellar'],
  serverExternalPackages: ['@stellar/stellar-sdk'],
}

export default nextConfig
