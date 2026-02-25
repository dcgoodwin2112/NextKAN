"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  userId?: string | null;
  userName?: string | null;
  details?: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "dataset:created": "Created",
  "dataset:updated": "Updated",
  "dataset:deleted": "Deleted",
  "organization:created": "Created",
  "organization:updated": "Updated",
  "organization:deleted": "Deleted",
  "user:created": "Created",
  "user:updated": "Updated",
  "user:deleted": "Deleted",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  dataset: "Dataset",
  organization: "Organization",
  user: "User",
};

function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return then.toLocaleDateString();
}

function getEntityLink(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case "dataset":
      return `/admin/datasets/${entityId}/edit`;
    case "organization":
      return `/admin/organizations/${entityId}/edit`;
    case "user":
      return `/admin/users/${entityId}/edit`;
    default:
      return null;
  }
}

function parseDetails(details: string | null | undefined): string {
  if (!details) return "\u2014";
  try {
    const parsed = JSON.parse(details);
    if (parsed.changes && typeof parsed.changes === "object") {
      return Object.keys(parsed.changes).join(", ");
    }
    if (typeof parsed === "object") {
      return Object.keys(parsed).join(", ");
    }
    return details;
  } catch {
    return details;
  }
}

const PAGE_SIZE = 20;

export function ActivityTable() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Filters
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("entityType")) setEntityType(params.get("entityType")!);
    if (params.get("action")) setAction(params.get("action")!);
    if (params.get("userId")) {
      setUserId(params.get("userId")!);
      // Fetch userName for display
      fetchUserName(params.get("userId")!);
    }
    if (params.get("startDate")) setStartDate(params.get("startDate")!);
    if (params.get("endDate")) setEndDate(params.get("endDate")!);
  }, []);

  async function fetchUserName(uid: string) {
    try {
      const res = await fetch(`/api/activity?userId=${uid}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.activities?.[0]?.userName) {
          setUserSearch(data.activities[0].userName);
        }
      }
    } catch {
      // Ignore — user can still type manually
    }
  }

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);
    if (userId) params.set("userId", userId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));

    try {
      const res = await fetch(`/api/activity?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities);
        setTotal(data.total);
      }
    } catch {
      // Network error — leave current state
    } finally {
      setLoading(false);
    }
  }, [entityType, action, userId, startDate, endDate, page]);

  // Fetch on filter/page change
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);
    if (userId) params.set("userId", userId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [entityType, action, userId, startDate, endDate]);

  function handleUserSearchChange(value: string) {
    setUserSearch(value);
    // Clear userId when user types manually (userId is for pre-fill only)
    if (userId) setUserId("");
    clearTimeout(debounceRef.current);
    // We don't filter by userName on the API since the field is userId
    // User search clears the userId filter
  }

  async function handleExportCSV() {
    const params = new URLSearchParams();
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);
    if (userId) params.set("userId", userId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("format", "csv");

    const res = await fetch(`/api/activity?${params.toString()}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "activity-log.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showTo = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Entity Type</label>
          <NativeSelect
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(0); }}
            aria-label="Filter by entity type"
          >
            <option value="">All</option>
            <option value="dataset">Dataset</option>
            <option value="organization">Organization</option>
            <option value="user">User</option>
          </NativeSelect>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Action</label>
          <NativeSelect
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(0); }}
            aria-label="Filter by action"
          >
            <option value="">All</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
          </NativeSelect>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">User</label>
          <Input
            type="text"
            placeholder="Filter by user..."
            value={userSearch}
            onChange={(e) => handleUserSearchChange(e.target.value)}
            className="w-40"
            aria-label="Filter by user"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">From</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            aria-label="Start date"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">To</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            aria-label="End date"
          />
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      {!loading && activities.length === 0 ? (
        <EmptyState
          title="No activity found"
          description="No activity logs match the current filters."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }, (_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : activities.map((activity) => {
                  const entityLink = getEntityLink(
                    activity.entityType,
                    activity.entityId
                  );
                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="text-text-muted text-sm whitespace-nowrap">
                        {formatRelativeTime(activity.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {activity.userName || "System"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ACTION_LABELS[activity.action] || activity.action}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-text-muted">
                          {ENTITY_TYPE_LABELS[activity.entityType] ||
                            activity.entityType}
                          :{" "}
                        </span>
                        {entityLink ? (
                          <Link
                            href={entityLink}
                            className="text-primary hover:underline"
                          >
                            {activity.entityName}
                          </Link>
                        ) : (
                          activity.entityName
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-text-muted">
                        {parseDetails(activity.details)}
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-text-muted">
            Showing {showFrom}&ndash;{showTo} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
