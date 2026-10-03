import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JuriQuizz",
    short_name: "JuriQuizz",
    description: "Quiz de révision pour la L1 de droit, en trois niveaux, avec des explications détaillées.",
    lang: "fr",
    start_url: "/cours",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ece9e2",
    theme_color: "#8f3d1c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
