import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  anthropicMessagesCreate,
  MockAnthropic,
} from "@/__mocks__/anthropic";

vi.mock("@anthropic-ai/sdk", () => ({ default: MockAnthropic }));

import {
  __resetAiClient,
  getAiClient,
  getAiModel,
  isAiAvailable,
} from "./client";
import { AiUnavailableError } from "./errors";

const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;
const ORIGINAL_MODEL = process.env.NEXTKAN_AI_MODEL;

beforeEach(() => {
  __resetAiClient();
  anthropicMessagesCreate.mockReset();
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.NEXTKAN_AI_MODEL;
});

afterEach(() => {
  if (ORIGINAL_KEY != null) process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
  if (ORIGINAL_MODEL != null) process.env.NEXTKAN_AI_MODEL = ORIGINAL_MODEL;
});

describe("isAiAvailable", () => {
  it("returns false when ANTHROPIC_API_KEY is unset", () => {
    expect(isAiAvailable()).toBe(false);
  });

  it("returns true when ANTHROPIC_API_KEY is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    expect(isAiAvailable()).toBe(true);
  });
});

describe("getAiModel", () => {
  it("defaults to claude-sonnet-4-6", () => {
    expect(getAiModel()).toBe("claude-sonnet-4-6");
  });

  it("respects NEXTKAN_AI_MODEL override", () => {
    process.env.NEXTKAN_AI_MODEL = "claude-opus-4-7";
    expect(getAiModel()).toBe("claude-opus-4-7");
  });
});

describe("getAiClient", () => {
  it("throws AiUnavailableError without an API key", () => {
    expect(() => getAiClient()).toThrow(AiUnavailableError);
  });

  it("returns a client when key is configured", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    const client = getAiClient();
    expect(client).toBeInstanceOf(MockAnthropic);
    expect((client as unknown as MockAnthropic).apiKey).toBe("sk-test");
  });

  it("caches the client across calls", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    expect(getAiClient()).toBe(getAiClient());
  });
});
