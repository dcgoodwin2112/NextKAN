"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DatasetTabsProps {
  resourcesContent: React.ReactNode;
  visualizationsContent?: React.ReactNode;
  historyContent?: React.ReactNode;
  commentsContent?: React.ReactNode;
  showVisualizations: boolean;
  showHistory: boolean;
  showComments: boolean;
}

export function DatasetTabs({
  resourcesContent,
  visualizationsContent,
  historyContent,
  commentsContent,
  showVisualizations,
  showHistory,
  showComments,
}: DatasetTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "resources";

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "resources") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <TabsList className="w-full justify-start">
        <TabsTrigger value="resources">Resources</TabsTrigger>
        {showVisualizations && (
          <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
        )}
        {showHistory && (
          <TabsTrigger value="history">History</TabsTrigger>
        )}
        {showComments && (
          <TabsTrigger value="comments">Comments</TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="resources" className="mt-4">
        {resourcesContent}
      </TabsContent>
      {showVisualizations && (
        <TabsContent value="visualizations" className="mt-4">
          {visualizationsContent}
        </TabsContent>
      )}
      {showHistory && (
        <TabsContent value="history" className="mt-4">
          {historyContent}
        </TabsContent>
      )}
      {showComments && (
        <TabsContent value="comments" className="mt-4">
          {commentsContent}
        </TabsContent>
      )}
    </Tabs>
  );
}
