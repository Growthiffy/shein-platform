const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4001";

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // Same-origin API proxy. See lib/api.js for why the browser must not call the backend directly.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};
