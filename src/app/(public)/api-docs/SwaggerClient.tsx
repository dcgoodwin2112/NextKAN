"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

interface SwaggerClientProps {
  url: string;
}

export function SwaggerClient({ url }: SwaggerClientProps) {
  return <SwaggerUI url={url} />;
}
