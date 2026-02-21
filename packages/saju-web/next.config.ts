import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/saju',
  transpilePackages: ['saju-lib'],
  env: {
    NEXT_PUBLIC_BASE_PATH: '/saju',
  },
};

export default nextConfig;
