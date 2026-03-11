import { headers } from "next/headers";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { BackToTop } from "@/components/public/BackToTop";
import { siteConfig } from "@/lib/config";
import { isPublicFrontendEnabled } from "@/lib/services/settings";
import { getSetting } from "@/lib/services/settings";
import { listPublishedPagesByLocation } from "@/lib/actions/pages";

const BYPASS_PATHS = ["/login", "/register", "/verify-email"];

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = isPublicFrontendEnabled();

  if (!enabled) {
    const headerList = await headers();
    const pathname = headerList.get("x-next-pathname") || headerList.get("x-invoke-path") || "";

    if (!BYPASS_PATHS.some((p) => pathname.startsWith(p))) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Public Frontend Disabled</h1>
          <p className="text-text-muted mb-6">
            The public frontend is currently disabled. The API and admin interface remain available.
          </p>
          <Link href="/login" className="text-primary hover:underline font-medium">
            Go to Admin Login
          </Link>
        </div>
      );
    }
  }

  const [headerPages, footerPages] = await Promise.all([
    listPublishedPagesByLocation("header"),
    listPublishedPagesByLocation("footer"),
  ]);

  const siteName = siteConfig.name;
  const logo = siteConfig.logo;
  const bannerText = getSetting("BANNER_TEXT");
  const footerAbout = getSetting("FOOTER_ABOUT");

  if (!enabled) {
    // Bypass path — render minimal layout for login/register/verify
    return (
      <div className="flex min-h-screen flex-col">
        <Header siteName={siteName} pages={headerPages} />
        <main className="flex-1">{children}</main>
        <Footer pages={footerPages} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader
        siteName={siteName}
        logo={logo || undefined}
        bannerText={bannerText || undefined}
        pages={headerPages}
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter
        siteName={siteName}
        footerAbout={footerAbout || undefined}
        pages={footerPages}
      />
      <BackToTop />
    </div>
  );
}
