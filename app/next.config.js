/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for development best practices
  reactStrictMode: true,

  // Allow images from any domain (for avatars, etc.)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234",
  },
};

module.exports = nextConfig;
