import Anthropic from "@anthropic-ai/sdk";

import { AiUnavailableError } from "./errors";

const DEFAULT_MODEL = "claude-sonnet-4-6";

let cached: Anthropic | undefined;

/** True when an Anthropic API key is configured. Server-only check. */
export function isAiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Configured model name. Defaults to `claude-sonnet-4-6`. */
export function getAiModel(): string {
  return process.env.NEXTKAN_AI_MODEL || DEFAULT_MODEL;
}

/**
 * Cached Anthropic client. Throws `AiUnavailableError` when the API key is
 * absent — callers should pre-check with `isAiAvailable()` to fail soft.
 */
export function getAiClient(): Anthropic {
  if (!isAiAvailable()) {
    throw new AiUnavailableError();
  }
  if (!cached) {
    cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cached;
}

/** Reset the cached client. Used by tests; not part of the public API. */
export function __resetAiClient(): void {
  cached = undefined;
}
