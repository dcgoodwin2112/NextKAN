import { getSetting } from "@/lib/services/settings";

export const siteConfig = {
  get name() {
    return getSetting("SITE_NAME", "NextKAN");
  },
  get description() {
    return getSetting("SITE_DESCRIPTION", "Open data catalog — browse and download public datasets");
  },
  get url() {
    return getSetting("SITE_URL", "http://localhost:3000");
  },
  get logo() {
    return getSetting("SITE_LOGO", "");
  },
  get heroTitle() {
    return getSetting("HERO_TITLE") || this.name;
  },
  get heroDescription() {
    return getSetting("HERO_DESCRIPTION") || this.description;
  },
};
