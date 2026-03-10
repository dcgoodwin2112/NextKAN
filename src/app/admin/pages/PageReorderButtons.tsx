"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PageReorderButtonsProps {
  pageId: string;
  isFirst: boolean;
  isLast: boolean;
}

export function PageReorderButtons({
  pageId,
  isFirst,
  isLast,
}: PageReorderButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReorder(direction: "up" | "down") {
    startTransition(async () => {
      try {
        const { reorderPages } = await import("@/lib/actions/pages");
        await reorderPages(pageId, direction);
        router.refresh();
      } catch {
        toast.error("Failed to reorder pages");
      }
    });
  }

  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={isFirst || isPending}
        onClick={() => handleReorder("up")}
        aria-label="Move up"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={isLast || isPending}
        onClick={() => handleReorder("down")}
        aria-label="Move down"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
