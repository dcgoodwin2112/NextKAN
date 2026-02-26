import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/lib/config";
import { listPublishedPagesByLocation } from "@/lib/actions/pages";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [headerPages, footerPages] = await Promise.all([
    listPublishedPagesByLocation("header"),
    listPublishedPagesByLocation("footer"),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header siteName={siteConfig.name} pages={headerPages} />
      <main className="flex-1">{children}</main>
      <Footer pages={footerPages} />
    </div>
  );
}
