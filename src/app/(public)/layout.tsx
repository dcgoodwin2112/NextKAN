import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/lib/config";
import { listPublishedPages } from "@/lib/actions/pages";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pages = await listPublishedPages();

  return (
    <div className="flex min-h-screen flex-col">
      <Header siteName={siteConfig.name} pages={pages} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
