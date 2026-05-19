import pino from "pino";

export const logger = pino({
  name: "nextkan-mcp",
  level: process.env.LOG_LEVEL ?? "info",
});

export type Logger = typeof logger;
