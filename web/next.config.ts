import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The public La Patisserie website is the static site in public/site; its order form and product
  // list talk to /api/site/*. Staff sign in at /login.
  async rewrites() {
    return [{ source: "/", destination: "/site/index.html" }];
  },
  // Let browsers and Vercel's CDN keep the website's files instead of asking again on every visit.
  async headers() {
    return [
      {
        source: "/site/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/site/:file(style.css|script.js)",
        headers: [{ key: "Cache-Control", value: "public, max-age=600, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
