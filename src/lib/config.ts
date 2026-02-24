export const siteConfig = {
  name: process.env.SITE_NAME || "NextKAN",
  description: process.env.SITE_DESCRIPTION || "Open data catalog — browse and download public datasets",
  url: process.env.SITE_URL || "http://localhost:3000",
  logo: process.env.SITE_LOGO || "",
  heroTitle: process.env.HERO_TITLE || process.env.SITE_NAME || "NextKAN",
  heroDescription: process.env.HERO_DESCRIPTION || "Open data catalog — browse and download public datasets",
};
