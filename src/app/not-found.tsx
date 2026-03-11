import Link from "next/link";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-text-muted mb-8 max-w-md">
        The page you are looking for does not exist or has been moved.
        Try searching for what you need.
      </p>
      <div className="w-full max-w-md mb-6">
        <SearchBar placeholder="Search datasets..." />
      </div>
      <Link href="/">
        <Button variant="outline">Go to Home Page</Button>
      </Link>
    </div>
  );
}
