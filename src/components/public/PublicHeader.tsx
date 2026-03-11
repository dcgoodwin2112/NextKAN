"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Menu, X, Search } from "lucide-react";
import { useRouter } from "next/navigation";

const staticNavLinks = [
  { href: "/datasets", label: "Datasets" },
  { href: "/themes", label: "Themes" },
  { href: "/organizations", label: "Organizations" },
  { href: "/api-docs", label: "API" },
];

interface PublicHeaderProps {
  siteName: string;
  logo?: string;
  bannerText?: string;
  pages?: { title: string; slug: string }[];
}

export function PublicHeader({
  siteName,
  logo,
  bannerText,
  pages = [],
}: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const navLinks = [
    ...staticNavLinks,
    ...pages.map((p) => ({ href: `/pages/${p.slug}`, label: p.title })),
  ];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/datasets?search=${encodeURIComponent(trimmed)}`);
      setSearchQuery("");
      setMenuOpen(false);
    }
  }

  return (
    <header className="border-b border-border bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2"
      >
        Skip to main content
      </a>

      {bannerText && (
        <div className="bg-hero-bg text-hero-text text-center text-sm py-1.5 px-4">
          {bannerText}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
        {/* Logo + Site Name */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {logo && (
            <Image
              src={logo}
              alt={`${siteName} logo`}
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          )}
          <span className="text-2xl font-bold text-foreground">{siteName}</span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden lg:flex items-center gap-1 ml-6"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-base text-text-secondary hover:text-foreground hover:bg-surface rounded-md transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop search + actions */}
        <div className="hidden lg:flex items-center gap-2 ml-auto">
          <form onSubmit={handleSearch} className="flex gap-1" role="search">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search datasets..."
              className="w-48 h-9 text-sm"
              aria-label="Search datasets"
            />
            <Button type="submit" size="sm" variant="ghost" aria-label="Search">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <ThemeToggle />
          <Link href="/login">
            <Button variant="outline" size="sm">
              Admin
            </Button>
          </Link>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 ml-auto lg:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-border">
          <div className="px-4 py-3">
            <form onSubmit={handleSearch} className="flex gap-2 mb-3" role="search">
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search datasets..."
                className="flex-1"
                aria-label="Search datasets"
              />
              <Button type="submit" size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <nav className="space-y-1" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-2 px-2 text-base text-text-secondary hover:bg-surface rounded-md"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                className="block py-2 px-2 text-base text-text-secondary hover:bg-surface rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
