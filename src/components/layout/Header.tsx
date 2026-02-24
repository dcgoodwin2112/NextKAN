"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const staticNavLinks = [
  { href: "/datasets", label: "Datasets" },
  { href: "/themes", label: "Themes" },
  { href: "/organizations", label: "Organizations" },
  { href: "/api-docs", label: "API" },
  { href: "/login", label: "Admin" },
];

interface HeaderProps {
  siteName?: string;
  pages?: { title: string; slug: string }[];
}

export function Header({ siteName = "NextKAN", pages = [] }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    ...staticNavLinks,
    ...pages.map((p) => ({ href: `/pages/${p.slug}`, label: p.title })),
  ];

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-foreground">
          {siteName}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-text-secondary hover:underline">
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-border px-4 py-2 space-y-1" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-2 text-text-secondary hover:bg-surface rounded px-2"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
