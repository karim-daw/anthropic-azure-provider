import { describe, it, expect } from "vitest";
import { convertPrompt } from "../../src/converters.js";

describe("convertPrompt", () => {
  describe("convertPrompt", () => {
    it("should extract system message", () => {
      const prompt = [
        { role: "system" as const, content: "You are a helpful assistant." },
        { role: "user" as const, content: "Hello" },
      ];

      const result = convertPrompt(prompt);

      expect(result.system).toBe("You are a helpful assistant.");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]!.role).toBe("user");
    });

    it("should handle system message with array content", () => {
      const prompt = [
        {
          role: "system" as const,
          content: [
            { type: "text", text: "First instruction." },
            { type: "text", text: "Second instruction." },
          ],
        },
        { role: "user" as const, content: "Hello" },
      ];

      const result = convertPrompt(prompt);

      expect(result.system).toBe("First instruction.\nSecond instruction.");
    });

    it("should convert simple user message", () => {
      const prompt = [{ role: "user" as const, content: "Hello" }];

      const result = convertPrompt(prompt);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual({
        role: "user",
        content: "Hello",
      });
    });

    it("should convert user message with array content", () => {
      const prompt = [
        {
          role: "user" as const,
          content: [
            { type: "text", text: "First part" },
            { type: "text", text: "Second part" },
          ],
        },
      ];

      const result = convertPrompt(prompt);

      expect(result.messages[0]!.content).toEqual([
        { type: "text", text: "First part" },
        { type: "text", text: "Second part" },
      ]);
    });

    it("should simplify single text block to string", () => {
      const prompt = [
        {
          role: "user" as const,
          content: [{ type: "text", text: "Single text" }],
        },
      ];

      const result = convertPrompt(prompt);

      expect(result.messages[0]!.content).toBe("Single text");
    });

    it("should convert assistant message", () => {
      const prompt = [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi there!" },
      ];

      const result = convertPrompt(prompt);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]).toEqual({
        role: "assistant",
        content: "Hi there!",
      });
    });

    it("should convert tool result message to user message", () => {
      const prompt = [
        { role: "user" as const, content: "What's the weather?" },
        {
          role: "assistant" as const,
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "get_weather",
              args: '{"location": "NYC"}',
            },
          ],
        },
        {
          role: "tool" as const,
          content: [
            {
              type: "tool-result",
              toolCallId: "call_123",
              result: { temp: 72 },
            },
          ],
        },
      ];

      const result = convertPrompt(prompt);

      expect(result.messages).toHaveLength(3);
      expect(result.messages[2]!.role).toBe("user");
      expect(result.messages[2]!.content).toEqual([
        {
          type: "tool_result",
          tool_use_id: "call_123",
          content: '{"temp":72}',
        },
      ]);
    });

    it("should handle tool result with string result", () => {
      const prompt = [
        {
          role: "tool" as const,
          content: [
            {
              type: "tool-result",
              toolCallId: "call_123",
              result: "Success",
            },
          ],
        },
      ];

      const result = convertPrompt(prompt);

      expect(result.messages[0]!.content).toEqual([
        {
          type: "tool_result",
          tool_use_id: "call_123",
          content: "Success",
        },
      ]);
    });

    it("should handle tool result with error flag", () => {
      const prompt = [
        {
          role: "tool" as const,
          content: [
            {
              type: "tool-result",
              toolCallId: "call_123",
              result: "Error occurred",
              isError: true,
            },
          ],
        },
      ];

      const result = convertPrompt(prompt);

      const content = result.messages[0]!.content;
      expect(Array.isArray(content)).toBe(true);
      expect((content as unknown as ReadonlyArray<{ is_error?: boolean }>)[0]!.is_error).toBe(true);
    });

    it("should merge consecutive user messages", () => {
      const prompt = [
        { role: "user" as const, content: "First message" },
        { role: "user" as const, content: "Second message" },
      ];

      const result = convertPrompt(prompt);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]!.content).toEqual([
        { type: "text", text: "First message" },
        { type: "text", text: "Second message" },
      ]);
    });

    it("should merge consecutive assistant messages", () => {
      const prompt = [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "First response" },
        { role: "assistant" as const, content: "Second response" },
      ];

      const result = convertPrompt(prompt);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]!.content).toEqual([
        { type: "text", text: "First response" },
        { type: "text", text: "Second response" },
      ]);
    });

    it("should not merge messages with different roles", () => {
      const prompt = [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi" },
        { role: "user" as const, content: "How are you?" },
      ];

      const result = convertPrompt(prompt);

      expect(result.messages).toHaveLength(3);
    });

    it("should handle empty prompt", () => {
      const result = convertPrompt([]);

      expect(result.system).toBeUndefined();
      expect(result.messages).toHaveLength(0);
    });

    it("should handle prompt with only system message", () => {
      const prompt = [{ role: "system" as const, content: "Be helpful" }];

      const result = convertPrompt(prompt);

      expect(result.system).toBe("Be helpful");
      expect(result.messages).toHaveLength(0);
    });
  });
});
