import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PAGES = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/login", priority: 0.6, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.flatMap(({ path, priority, changeFrequency }) => {
    const en = `${SITE_URL}${path || "/"}`;
    const ar = `${SITE_URL}/ar${path}`;
    const alternates = { languages: { en, ar, "x-default": en } };
    return [
      { url: en, lastModified, changeFrequency, priority, alternates },
      { url: ar, lastModified, changeFrequency, priority: priority * 0.9, alternates },
    ];
  });
}
