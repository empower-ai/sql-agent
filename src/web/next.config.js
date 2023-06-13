/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true
  },
  webpack(config, _) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true
    };

    return config;
  }
};

module.exports = nextConfig;
