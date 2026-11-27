import type { MetadataRoute } from "next";

/**
 * Only the landing at `/` is crawlable, and only in production; every other
 * path and every preview stays disallowed. `/$` is the longer match for the
 * root, so it wins over the blanket `/` disallow.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "production") {
    return { rules: { userAgent: "*", allow: "/$", disallow: "/" } };
  }
  return { rules: { userAgent: "*", disallow: "/" } };
}
