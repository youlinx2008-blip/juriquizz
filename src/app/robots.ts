import type { MetadataRoute } from "next";

/** Pendant la bêta, seule la page d'accueil est à indexer. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/$", "/a-propos"], disallow: ["/"] },
  };
}
