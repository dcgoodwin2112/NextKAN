import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/actions/pages";
import { siteConfig } from "@/lib/config";
import { extractHeadings } from "@/lib/utils/markdown";
import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { rehypeChartPlaceholder } from "@/lib/utils/rehype-chart-placeholder";
import { PageChartHydrator } from "@/components/visualizations/PageChartHydrator";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page || !page.published) {
    return { title: "Page Not Found" };
  }

  const title = page.metaTitle || page.title;
  const metadata: Metadata = {
    title: `${title} | ${siteConfig.name}`,
    alternates: { canonical: `${siteConfig.url}/pages/${page.slug}` },
  };

  if (page.metaDescription) {
    metadata.description = page.metaDescription;
  }

  if (page.imageUrl) {
    metadata.openGraph = {
      title: `${title} | ${siteConfig.name}`,
      images: [{ url: page.imageUrl }],
    };
  }

  return metadata;
}

export default async function PublicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page || !page.published) {
    notFound();
  }

  const processed = await remark()
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeSlug)
    .use(rehypeChartPlaceholder)
    .use(rehypeStringify)
    .process(page.content);
  const contentHtml = processed.toString();

  const publishedChildren = (page.children || []).filter((c) => c.published);
  const headings = extractHeadings(page.content);

  // Sibling pages from parent.children (when this is a child page)
  const siblings =
    page.parent && "children" in page.parent
      ? (page.parent as { children: { id: string; title: string; slug: string }[] }).children
      : [];

  // Template-based layout classes
  const layoutClass =
    page.template === "full-width"
      ? "mx-auto max-w-7xl px-4 py-8"
      : page.template === "sidebar"
        ? "mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8"
        : "mx-auto max-w-4xl px-4 py-8";

  const mainContent = (
    <div>
      {/* Hero image */}
      {page.imageUrl && (
        <img
          src={page.imageUrl}
          alt={page.title}
          className="w-full h-48 md:h-64 object-cover rounded-lg mb-6"
        />
      )}

      {/* Breadcrumbs for child pages */}
      {page.parent && (
        <nav className="text-sm text-text-muted mb-4" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">&gt;</span>
          <Link
            href={`/pages/${page.parent.slug}`}
            className="hover:underline"
          >
            {page.parent.title}
          </Link>
          <span className="mx-2">&gt;</span>
          <span>{page.title}</span>
        </nav>
      )}

      <h1 className="text-3xl font-bold mb-6">{page.title}</h1>
      <div
        id="page-content"
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      {contentHtml.includes("data-chart-id") && (
        <PageChartHydrator containerSelector="#page-content" />
      )}

      {/* Child page links */}
      {publishedChildren.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-xl font-semibold mb-4">Related Pages</h2>
          <ul className="space-y-2">
            {publishedChildren.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/pages/${child.slug}`}
                  className="text-primary hover:underline"
                >
                  {child.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  if (page.template === "sidebar") {
    return (
      <div className={layoutClass}>
        <aside className="space-y-6">
          {/* Sibling nav for child pages */}
          {page.parent && siblings.length > 0 && (
            <nav className="space-y-1" aria-label="Section navigation">
              <Link
                href={`/pages/${page.parent.slug}`}
                className="block text-sm font-semibold text-text-muted mb-2 hover:text-primary"
              >
                {page.parent.title}
              </Link>
              {siblings.map((sibling) => (
                <Link
                  key={sibling.id}
                  href={`/pages/${sibling.slug}`}
                  className={`block text-sm py-1 ${
                    sibling.slug === page.slug
                      ? "font-bold text-primary"
                      : "text-text-secondary hover:text-primary"
                  }`}
                >
                  {sibling.title}
                </Link>
              ))}
            </nav>
          )}

          {/* Children nav for parent pages */}
          {!page.parent && publishedChildren.length > 0 && (
            <nav className="space-y-1" aria-label="Page navigation">
              <p className="text-sm font-semibold text-text-muted mb-2">
                In this section
              </p>
              {publishedChildren.map((child) => (
                <Link
                  key={child.id}
                  href={`/pages/${child.slug}`}
                  className="block text-sm text-text-secondary hover:text-primary py-1"
                >
                  {child.title}
                </Link>
              ))}
            </nav>
          )}

          {/* Table of contents */}
          {headings.length > 0 && (
            <nav className="space-y-1" aria-label="Table of contents">
              {(siblings.length > 0 || publishedChildren.length > 0) && (
                <hr className="border-border" />
              )}
              <p className="text-sm font-semibold text-text-muted mb-2">
                On this page
              </p>
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`block text-sm text-text-secondary hover:text-primary py-0.5 ${
                    heading.level === 3 ? "pl-4" : ""
                  }`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          )}
        </aside>
        {mainContent}
      </div>
    );
  }

  return <div className={layoutClass}>{mainContent}</div>;
}
