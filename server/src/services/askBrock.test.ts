import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAskBrockContent = vi.hoisted(() => vi.fn());
vi.mock("./googleDrive", () => ({ getAskBrockContent: mockGetAskBrockContent }));

const mockCreate = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

import { askBrock } from "./askBrock";

const NO_CONTENT_ANSWER =
  "I don't have anything on that in my content yet. I'd normally offer to connect you with our team here, but that part of the portal is still being built — hang tight.";

function textResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
});

describe("askBrock", () => {
  it("returns the canned no-content answer when Drive has no documents", async () => {
    mockGetAskBrockContent.mockResolvedValue([]);

    const result = await askBrock("What is the Rockefeller method?");

    expect(result).toEqual({ answer: NO_CONTENT_ANSWER, grounded: false, sources: [] });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns the canned answer when the model reports it isn't grounded", async () => {
    mockGetAskBrockContent.mockResolvedValue([{ id: "1", title: "Doc A", content: "...", modifiedTime: "", webViewLink: null }]);
    mockCreate.mockResolvedValue(textResponse(JSON.stringify({ grounded: false, answer: "", sourceTitles: [] })));

    const result = await askBrock("Unrelated question");

    expect(result.grounded).toBe(false);
    expect(result.answer).toBe(NO_CONTENT_ANSWER);
    expect(result.sources).toEqual([]);
  });

  it("returns the canned answer when the model's response isn't valid JSON", async () => {
    mockGetAskBrockContent.mockResolvedValue([{ id: "1", title: "Doc A", content: "...", modifiedTime: "", webViewLink: null }]);
    mockCreate.mockResolvedValue(textResponse("not json at all"));

    const result = await askBrock("Question");

    expect(result.grounded).toBe(false);
    expect(result.answer).toBe(NO_CONTENT_ANSWER);
  });

  it("extracts JSON even when the model wraps it in prose", async () => {
    mockGetAskBrockContent.mockResolvedValue([{ id: "1", title: "Doc A", content: "...", modifiedTime: "", webViewLink: null }]);
    mockCreate.mockResolvedValue(
      textResponse(`Sure, here you go:\n${JSON.stringify({ grounded: true, answer: "Here's my answer.", sourceTitles: ["Doc A"] })}\nHope that helps!`)
    );

    const result = await askBrock("Question");

    expect(result.grounded).toBe(true);
    expect(result.answer).toBe("Here's my answer.");
  });

  it("only includes sources the model actually cited by title", async () => {
    mockGetAskBrockContent.mockResolvedValue([
      { id: "1", title: "Doc A", content: "...", modifiedTime: "", webViewLink: "https://a" },
      { id: "2", title: "Doc B", content: "...", modifiedTime: "", webViewLink: "https://b" },
    ]);
    mockCreate.mockResolvedValue(
      textResponse(JSON.stringify({ grounded: true, answer: "Answer text", sourceTitles: ["Doc B"] }))
    );

    const result = await askBrock("Question");

    expect(result.sources).toEqual([{ title: "Doc B", webViewLink: "https://b" }]);
  });

  it("falls back to the canned answer when 'grounded' is true but the answer is empty", async () => {
    mockGetAskBrockContent.mockResolvedValue([{ id: "1", title: "Doc A", content: "...", modifiedTime: "", webViewLink: null }]);
    mockCreate.mockResolvedValue(textResponse(JSON.stringify({ grounded: true, answer: "", sourceTitles: [] })));

    const result = await askBrock("Question");

    expect(result.grounded).toBe(false);
    expect(result.answer).toBe(NO_CONTENT_ANSWER);
  });
});
