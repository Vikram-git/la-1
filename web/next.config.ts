import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The public La Patisserie website is the static site in public/site; its order form and product
  // list talk to /api/site/*. Staff sign in at /login.
  async rewrites() {
    return [{ source: "/", destination: "/site/index.html" }];
  },
};

export default nextConfig;
