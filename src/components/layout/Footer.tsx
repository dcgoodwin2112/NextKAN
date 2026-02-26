import Link from "next/link";

interface FooterProps {
  pages?: { title: string; slug: string }[];
}

export function Footer({ pages = [] }: FooterProps) {
  return (
    <footer className="border-t border-border bg-surface py-6 mt-auto">
      <div className="mx-auto max-w-7xl px-4">
        {pages.length > 0 && (
          <nav className="flex flex-wrap justify-center gap-4 mb-4 text-sm" aria-label="Footer navigation">
            {pages.map((page) => (
              <Link
                key={page.slug}
                href={`/pages/${page.slug}`}
                className="text-text-secondary hover:underline"
              >
                {page.title}
              </Link>
            ))}
          </nav>
        )}
        <div className="text-center text-sm text-text-muted">
          Powered by NextKAN — Open Data Catalog Platform
        </div>
      </div>
    </footer>
  );
}
