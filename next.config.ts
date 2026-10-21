import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";


const withPWA = withPWAInit({
  dest: "public",
  register: true,
  sw: "sw.js",
  disable: process.env.NODE_ENV === "development",
  publicExcludes: ["!icons/**/*", "!manifest.json"],
  workboxOptions: {
    skipWaiting: true,
    // Si vous devez exclure des fichiers du pré-cache, utilisez exclude (tableau de chaînes)
    // exclude: [/middleware-manifest\.json$/],
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "sidibe-offlineCache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 24 * 60 * 60,
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/dashboard/admin', destination: '/', permanent: false },
      { source: '/dashboard', destination: '/', permanent: false },
    ];
  },
};

export default withPWA(nextConfig);