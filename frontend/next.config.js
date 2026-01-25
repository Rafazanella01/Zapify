/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pps.whatsapp.net',
      },
    ],
  },
};

module.exports = nextConfig;
