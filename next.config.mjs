/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Next.js defaults Server Action request bodies to 1MB, which silently
      // rejects most real photo uploads (phone camera photos are commonly
      // 2-8MB). Doctor/banner photo forms submit as Server Actions, so this
      // needs to be raised to match the 5MB limit enforced in lib/blob.ts.
      bodySizeLimit: "8mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
