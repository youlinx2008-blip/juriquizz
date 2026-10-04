import type { MetadataRoute } from "next";

/** Pages publiques à indexer : présentation, tarifs, aperçus des cours, textes légaux. Le reste est privé. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/$",
        "/a-propos",
        "/tarifs$",
        "/apercu/",
        "/cgu",
        "/cgv",
        "/mentions-legales",
        "/confidentialite",
      ],
      disallow: ["/"],
    },
  };
}
