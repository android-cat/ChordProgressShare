/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['tone'],
  webpack: (config) => {
    // Tone.js ESM は拡張子なし import（例: "./core/Global"）を含むため、
    // webpack の "fully specified" 解決を緩めないと解決に失敗することがある。
    config.module.rules.push({
      test: /tone\/build\/esm/,
      resolve: {
        fullySpecified: false,
      },
    })
    return config
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
