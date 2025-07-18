import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Enables static site generation for GitHub Pages
  images: {
    unoptimized: true,
  },
  basePath: '/paws-and-preferences-kitty', // Matches GitHub Pages repository name
  assetPrefix: '/paws-and-preferences-kitty/',
};

export default nextConfig;
