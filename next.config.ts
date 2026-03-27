import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Proxy /api/* calls to the backend server
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8095/api/:path*",
      },
    ]
  },

  // Required for @sqlite.org/sqlite-wasm OPFS persistence.
  // SharedArrayBuffer (needed by OpfsDb) is only available in
  // cross-origin isolated contexts.
  async headers() {
    return [
      {
        // COEP/COOP for pages (needed for SharedArrayBuffer/OPFS)
        source: "/((?!api/).*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      {
        // API routes need permissive CORS — no COEP blocking
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: "*" },
          { key: "Cross-Origin-Resource-Policy",  value: "cross-origin" },
        ],
      },
    ]
  },
}

export default nextConfig
