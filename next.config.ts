import type { NextConfig } from "next";

// Validate environment variables at startup. Importing here means `next dev`,
// `next build` and `next start` all fail immediately (naming the offending
// variable) instead of blowing up lazily on whichever page first reads a key.
import "./env";

const nextConfig: NextConfig = {/* config options here */};

export default nextConfig;
