"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string | number;
  bordered?: boolean;
  headingLevel?: "h2" | "h3";
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  badge,
  bordered = false,
  headingLevel: Heading = "h2",
}: CollapsibleSectionProps) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 text-lg font-semibold group w-full text-left"
        >
          <ChevronDown className="size-4 group-data-[state=closed]:hidden" />
          <ChevronRight className="size-4 group-data-[state=open]:hidden" />
          <Heading className="text-lg font-semibold">{title}</Heading>
          {badge != null && (
            <Badge variant="secondary">{badge}</Badge>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          className={cn(
            "mt-4",
            bordered && "rounded-lg border p-6"
          )}
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
