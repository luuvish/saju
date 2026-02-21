import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/saju',
  transpilePackages: ['saju-lib'],
};

export default nextConfig;
