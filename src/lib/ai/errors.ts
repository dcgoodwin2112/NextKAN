/**
 * Thrown when AI features are invoked but ANTHROPIC_API_KEY is not configured.
 * Callers (Server Actions, route handlers) should catch this and surface a
 * "Configure AI features" notice instead of a crash.
 */
export class AiUnavailableError extends Error {
  constructor(message = "AI features are not configured (ANTHROPIC_API_KEY missing)") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

/**
 * Thrown when the AI returns a response that can't be parsed or doesn't match
 * the requested schema. Includes the raw text for debugging.
 */
export class AiResponseError extends Error {
  constructor(
    message: string,
    public readonly rawResponse?: string,
  ) {
    super(message);
    this.name = "AiResponseError";
  }
}
