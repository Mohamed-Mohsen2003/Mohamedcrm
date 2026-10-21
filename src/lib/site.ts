export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
export const GITHUB_URL = "https://github.com/Mohamed-Mohsen2003/Mohamedcrm";
export const AUTHOR = { name: "Mohamed Mohsen", url: "https://github.com/Mohamed-Mohsen2003" };
