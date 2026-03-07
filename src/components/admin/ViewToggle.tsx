"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  basePath: string;
}

export function ViewToggle({ basePath }: ViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const view = searchParams.get("view") === "list" ? "list" : "grid";

  function setView(newView: "grid" | "list") {
    const params = new URLSearchParams(searchParams.toString());
    if (newView === "list") {
      params.set("view", "list");
    } else {
      params.delete("view");
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="flex gap-1">
      <Button
        size="icon"
        variant={view === "grid" ? "default" : "outline"}
        onClick={() => setView("grid")}
        aria-label="Grid view"
        aria-pressed={view === "grid"}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant={view === "list" ? "default" : "outline"}
        onClick={() => setView("list")}
        aria-label="List view"
        aria-pressed={view === "list"}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
