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
  async headers() {
    // Pages that must never show up in search results.
    const privatePaths = ["/admin", "/admin/:path*", "/en/admin", "/en/admin/:path*",
      "/bookings/:path*", "/en/bookings/:path*", "/directory/:path*", "/en/directory/:path*"];
    return [
      {
        source: "/:path*",
        headers: [
          // No other site may show these pages inside a frame.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Links to other sites send only the domain, never a private link.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      ...privatePaths.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
  images: {
    // AVIF first: noticeably sharper than WebP at the same file size.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
