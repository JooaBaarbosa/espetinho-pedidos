import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pedidos Brasamiga",
    short_name: "Pedidos",
    display: "standalone",
    start_url: "/",
    background_color: "#F3EBDF",
    theme_color: "#1C1512",
    icons: [
      { src: "/marca/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/marca/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
