"use client";

interface DownloadLinkProps {
  href: string;
  distributionId?: string;
  className?: string;
  children: React.ReactNode;
}

export function DownloadLink({
  href,
  distributionId,
  className,
  children,
}: DownloadLinkProps) {
  const handleClick = () => {
    if (!distributionId) return;
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "download",
        entityType: "distribution",
        entityId: distributionId,
      }),
    }).catch(() => {});
  };

  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
