import { vi } from "vitest";

/**
 * Test helper: builds a `messages.create()` response shaped like the real
 * Anthropic SDK return value.
 */
export function makeAnthropicTextResponse(text: string) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-6",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

/**
 * Shared mock for `client.messages.create`. Reset between tests with
 * `anthropicMessagesCreate.mockReset()`.
 */
export const anthropicMessagesCreate = vi.fn();

/**
 * Mock constructor returned by `vi.mock("@anthropic-ai/sdk")`. Each new
 * instance shares the `anthropicMessagesCreate` mock so tests can assert on
 * call args without holding a reference to the client.
 */
export class MockAnthropic {
  apiKey: string | undefined;
  messages = { create: anthropicMessagesCreate };

  constructor(opts: { apiKey?: string } = {}) {
    this.apiKey = opts.apiKey;
  }
}
