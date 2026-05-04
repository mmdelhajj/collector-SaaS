import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Hide the floating Next logo / compile indicator in the page corner.
  devIndicators: false,
  // HMR / dev-resource origin allowlist. Next 16 blocks cross-origin WebSocket
  // connections to /_next/webpack-hmr by default; without this, dev-only
  // assets (HMR, fonts) fail to load when the dev server is fronted by a
  // proxy domain.
  allowedDevOrigins: [
    "col.proxpanel.com",
    "139.162.182.87",
  ],
  // Force no-cache on every response while in dev so a fronting proxy
  // (col.proxpanel.com) or the browser can't serve stale JS chunks after a
  // rebuild — the symptom is a hydration mismatch where the SSR HTML matches
  // the new code but the client is running the old bundle. Production keeps
  // its default aggressive caching since chunk filenames are content-hashed.
  async headers() {
    if (!isDev) return [];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
  // Server Actions are gated by an origin allowlist — the request's Origin
  // must match one of these or Next.js silently 200s without running the
  // action. Behind a proxy/CDN we have to spell out the public hostname.
  experimental: {
    serverActions: {
      allowedOrigins: [
        "col.proxpanel.com",
        "localhost:3000",
        "127.0.0.1:3000",
        "139.162.182.87:3000",
      ],
    },
  },
};

export default nextConfig;
