import Link from "next/link";

interface PublicFooterProps {
  siteName: string;
  footerAbout?: string;
  pages?: { title: string; slug: string }[];
}

export function PublicFooter({
  siteName,
  footerAbout,
  pages = [],
}: PublicFooterProps) {
  return (
    <footer className="bg-footer-bg text-footer-text mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Nav links */}
          <div>
            <h2 className="text-base font-semibold uppercase tracking-wider mb-3">
              Navigation
            </h2>
            <nav aria-label="Footer navigation" className="space-y-2">
              <Link
                href="/datasets"
                className="block text-base text-footer-muted hover:text-footer-text transition-colors"
              >
                Datasets
              </Link>
              <Link
                href="/themes"
                className="block text-base text-footer-muted hover:text-footer-text transition-colors"
              >
                Themes
              </Link>
              <Link
                href="/organizations"
                className="block text-base text-footer-muted hover:text-footer-text transition-colors"
              >
                Organizations
              </Link>
              <Link
                href="/api-docs"
                className="block text-base text-footer-muted hover:text-footer-text transition-colors"
              >
                API
              </Link>
              {pages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/pages/${page.slug}`}
                  className="block text-base text-footer-muted hover:text-footer-text transition-colors"
                >
                  {page.title}
                </Link>
              ))}
            </nav>
          </div>

          {/* About */}
          <div>
            <h2 className="text-base font-semibold uppercase tracking-wider mb-3">
              About
            </h2>
            <p className="text-base text-footer-muted leading-relaxed">
              {footerAbout || `${siteName} is an open data catalog providing free access to public datasets.`}
            </p>
          </div>

          {/* Powered by */}
          <div>
            <h2 className="text-base font-semibold uppercase tracking-wider mb-3">
              Platform
            </h2>
            <p className="text-base text-footer-muted">
              Powered by{" "}
              <a
                href="https://github.com/dcgoodwin2112/NextKAN"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-footer-text transition-colors"
              >
                NextKAN
              </a>
              {" "}&mdash; Open Data Catalog
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-footer-muted">
          &copy; {new Date().getFullYear()} {siteName}
        </div>
      </div>
    </footer>
  );
}
