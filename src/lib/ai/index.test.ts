import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  anthropicMessagesCreate,
  MockAnthropic,
  makeAnthropicTextResponse,
} from "@/__mocks__/anthropic";

vi.mock("@anthropic-ai/sdk", () => ({ default: MockAnthropic }));

import { __resetAiClient } from "./client";
import {
  AiResponseError,
  AiUnavailableError,
  generateJson,
  generateText,
} from "./index";

const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;
const ORIGINAL_MODEL = process.env.NEXTKAN_AI_MODEL;

beforeEach(() => {
  __resetAiClient();
  anthropicMessagesCreate.mockReset();
  process.env.ANTHROPIC_API_KEY = "sk-test";
  delete process.env.NEXTKAN_AI_MODEL;
});

afterEach(() => {
  if (ORIGINAL_KEY != null) process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
  else delete process.env.ANTHROPIC_API_KEY;
  if (ORIGINAL_MODEL != null) process.env.NEXTKAN_AI_MODEL = ORIGINAL_MODEL;
});

describe("generateText", () => {
  it("throws AiUnavailableError when key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(generateText({ prompt: "hi" })).rejects.toThrow(
      AiUnavailableError,
    );
    expect(anthropicMessagesCreate).not.toHaveBeenCalled();
  });

  it("calls messages.create with configured model and defaults", async () => {
    anthropicMessagesCreate.mockResolvedValue(
      makeAnthropicTextResponse("hello world"),
    );

    const text = await generateText({ prompt: "say hi" });

    expect(text).toBe("hello world");
    expect(anthropicMessagesCreate).toHaveBeenCalledTimes(1);
    const arg = anthropicMessagesCreate.mock.calls[0][0];
    expect(arg).toMatchObject({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0.2,
      messages: [{ role: "user", content: "say hi" }],
    });
    expect(arg.system).toBeUndefined();
  });

  it("respects system prompt and per-call overrides", async () => {
    anthropicMessagesCreate.mockResolvedValue(makeAnthropicTextResponse(""));

    await generateText({
      system: "be brief",
      prompt: "summarize",
      maxTokens: 256,
      temperature: 0.7,
      model: "claude-opus-4-7",
    });

    expect(anthropicMessagesCreate).toHaveBeenCalledWith({
      model: "claude-opus-4-7",
      max_tokens: 256,
      temperature: 0.7,
      system: "be brief",
      messages: [{ role: "user", content: "summarize" }],
    });
  });

  it("joins multi-block text content and ignores non-text blocks", async () => {
    anthropicMessagesCreate.mockResolvedValue({
      ...makeAnthropicTextResponse(""),
      content: [
        { type: "text", text: "alpha " },
        { type: "tool_use", id: "t", name: "x", input: {} },
        { type: "text", text: "beta" },
      ],
    });

    const text = await generateText({ prompt: "x" });
    expect(text).toBe("alpha beta");
  });
});

describe("generateJson", () => {
  const schema = z.object({ title: z.string(), count: z.number() });

  it("parses plain JSON responses", async () => {
    anthropicMessagesCreate.mockResolvedValue(
      makeAnthropicTextResponse('{"title":"hi","count":3}'),
    );

    const out = await generateJson({ prompt: "x", schema });
    expect(out).toEqual({ title: "hi", count: 3 });
  });

  it("strips ```json code fences before parsing", async () => {
    anthropicMessagesCreate.mockResolvedValue(
      makeAnthropicTextResponse(
        '```json\n{"title":"hi","count":3}\n```',
      ),
    );

    const out = await generateJson({ prompt: "x", schema });
    expect(out).toEqual({ title: "hi", count: 3 });
  });

  it("strips bare ``` fences", async () => {
    anthropicMessagesCreate.mockResolvedValue(
      makeAnthropicTextResponse('```\n{"title":"hi","count":3}\n```'),
    );
    const out = await generateJson({ prompt: "x", schema });
    expect(out).toEqual({ title: "hi", count: 3 });
  });

  it("throws AiResponseError when content is not JSON", async () => {
    anthropicMessagesCreate.mockResolvedValue(
      makeAnthropicTextResponse("not json at all"),
    );
    await expect(generateJson({ prompt: "x", schema })).rejects.toThrow(
      AiResponseError,
    );
  });

  it("throws AiResponseError when JSON fails schema validation", async () => {
    anthropicMessagesCreate.mockResolvedValue(
      makeAnthropicTextResponse('{"title":"hi","count":"oops"}'),
    );
    await expect(generateJson({ prompt: "x", schema })).rejects.toThrow(
      AiResponseError,
    );
  });
});
