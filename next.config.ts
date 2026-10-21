import type { NextConfig } from "next";
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  sw: "sw.js",
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
  publicExcludes: ["!icons/**/*", "!manifest.json"],
  runtimeCaching: [
    // Pages Next.js — Network First
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "sidibe-offlineCache",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24h
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/admin',
        destination: '/',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default pwaConfig(nextConfig);
