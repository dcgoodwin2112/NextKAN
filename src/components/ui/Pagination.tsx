"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function getPageNumbers(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  pages.add(currentPage);
  if (currentPage - 1 >= 1) pages.add(currentPage - 1);
  if (currentPage + 1 <= totalPages) pages.add(currentPage + 1);

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]);
  }

  return result;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function navigateToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const items = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => navigateToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded border border-border px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface"
      >
        Previous
      </button>
      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 py-1 text-sm text-text-muted select-none"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => navigateToPage(item)}
            className={`rounded px-3 py-1 text-sm ${
              item === currentPage
                ? "bg-primary text-white"
                : "border border-border hover:bg-surface"
            }`}
            aria-current={item === currentPage ? "page" : undefined}
          >
            {item}
          </button>
        )
      )}
      <button
        onClick={() => navigateToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="rounded border border-border px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface"
      >
        Next
      </button>
    </nav>
  );
}
