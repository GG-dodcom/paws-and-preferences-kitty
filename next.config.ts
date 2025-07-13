import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Enables static site generation for GitHub Pages
  images: {
    unoptimized: true, // Disables image optimization for external Cataas images
  },
  basePath: '/paws-and-preferences-kitty', // Matches GitHub Pages repository name
};

export default nextConfig;
