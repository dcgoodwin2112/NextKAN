import type { z } from "zod";

import { getAiClient, getAiModel, isAiAvailable } from "./client";
import { AiResponseError, AiUnavailableError } from "./errors";

export { isAiAvailable, getAiModel } from "./client";
export { AiResponseError, AiUnavailableError } from "./errors";

const DEFAULT_MAX_TOKENS = 4096;

export interface GenerateTextOptions {
  /** System prompt; sets behavior/persona. */
  system?: string;
  /** User prompt. Required. */
  prompt: string;
  /** Token cap on the response. Default 4096. */
  maxTokens?: number;
  /** Sampling temperature 0..1. Default 0.2 (favor consistency). */
  temperature?: number;
  /** Override the configured model for this call. */
  model?: string;
}

export interface GenerateJsonOptions<T> extends GenerateTextOptions {
  /** Zod schema the parsed response must satisfy. */
  schema: z.ZodSchema<T>;
}

/**
 * Run a single-turn text completion. Returns the joined text content from the
 * assistant turn. Throws `AiUnavailableError` if the key is absent.
 */
export async function generateText(opts: GenerateTextOptions): Promise<string> {
  if (!isAiAvailable()) throw new AiUnavailableError();

  const client = getAiClient();
  const response = await client.messages.create({
    model: opts.model ?? getAiModel(),
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: opts.temperature ?? 0.2,
    ...(opts.system ? { system: opts.system } : {}),
    messages: [{ role: "user", content: opts.prompt }],
  });

  return extractText(response.content);
}

/**
 * Run a completion that must return JSON matching `schema`. Strips any
 * markdown code fences before parsing. Throws `AiResponseError` when the
 * model output can't be parsed or fails validation.
 */
export async function generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
  const raw = await generateText(opts);
  const stripped = stripCodeFence(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    throw new AiResponseError(
      `AI response was not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      raw,
    );
  }

  const result = opts.schema.safeParse(parsed);
  if (!result.success) {
    throw new AiResponseError(
      `AI response did not match schema: ${result.error.message}`,
      raw,
    );
  }
  return result.data;
}

function extractText(
  content: Array<{ type: string; text?: string }> | undefined,
): string {
  if (!content) return "";
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("");
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  // ```json\n...\n``` or ```\n...\n```
  const fence = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i;
  const match = trimmed.match(fence);
  return match ? match[1].trim() : trimmed;
}
