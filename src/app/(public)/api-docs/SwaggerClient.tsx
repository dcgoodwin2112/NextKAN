"use client";

import dynamic from "next/dynamic";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });
import "swagger-ui-react/swagger-ui.css";

interface SwaggerClientProps {
  url: string;
}

export function SwaggerClient({ url }: SwaggerClientProps) {
  return <SwaggerUI url={url} />;
}
