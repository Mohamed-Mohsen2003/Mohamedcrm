import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nexora CRM",
    short_name: "Nexora",
    description: "A fast, bilingual sales CRM — pipeline, leads, activities and reports.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f2f5f4",
    theme_color: "#0c2b27",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
