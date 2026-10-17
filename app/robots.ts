import type { MetadataRoute } from "next";

// Keep the control panel and the internal staff pages out of search
// engines (they're also marked noindex on the pages themselves).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/en/admin",
        "/directory/",
        "/en/directory/",
        "/bookings/",
        "/en/bookings/",
      ],
    },
  };
}
