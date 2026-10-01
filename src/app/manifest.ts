import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VibeLeague",
    short_name: "VibeLeague",
    description: "¿Cuánto conoces realmente a tus amigos?",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07060e",
    theme_color: "#07060e",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
