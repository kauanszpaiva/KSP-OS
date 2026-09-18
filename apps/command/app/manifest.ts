import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KSP OS Command",
    short_name: "Command",
    description: "KSP Dominion Group command center.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0A0A12",
    theme_color: "#0A0A12",
    icons: [
      {
        src: "/app-icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/app-icon-512.webp",
        sizes: "512x512",
        type: "image/webp",
        purpose: "any"
      },
      {
        src: "/app-icon-512.webp",
        sizes: "512x512",
        type: "image/webp",
        purpose: "maskable"
      }
    ]
  };
}
