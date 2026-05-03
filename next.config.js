/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/pikaohjeet',
        destination: '/pikaohjeet-v2',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
