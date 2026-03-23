/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@tradeflow/shared"],
  output: "standalone",
};

module.exports = nextConfig;
