import { describe, it, expect } from "vitest";
import { convertContent, convertStopReason } from "../../src/converters.js";

describe("ResponseConverter", () => {
  describe("convertContent", () => {
    it("should convert text content block", () => {
      const content = [{ type: "text" as const, text: "Hello, world!" }];

      const result = convertContent(content);

      expect(result).toEqual([
        { type: "text", text: "Hello, world!" },
      ]);
    });

    it("should convert tool_use content block", () => {
      const content = [
        {
          type: "tool_use" as const,
          id: "call_123",
          name: "get_weather",
          input: { location: "NYC" },
        },
      ];

      const result = convertContent(content);

      expect(result).toEqual([
        {
          type: "tool-call",
          toolCallId: "call_123",
          toolName: "get_weather",
          args: '{"location":"NYC"}',
        },
      ]);
    });

    it("should convert mixed content blocks", () => {
      const content = [
        { type: "text" as const, text: "Let me check the weather." },
        {
          type: "tool_use" as const,
          id: "call_456",
          name: "get_weather",
          input: { location: "Tokyo" },
        },
      ];

      const result = convertContent(content);

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe("text");
      expect(result[1]!.type).toBe("tool-call");
    });

    it("should handle empty content", () => {
      const result = convertContent([]);

      expect(result).toEqual([]);
    });

    it("should handle complex tool input", () => {
      const content = [
        {
          type: "tool_use" as const,
          id: "call_789",
          name: "search",
          input: {
            query: "test",
            filters: {
              date: "2024-01-01",
              category: ["a", "b"],
            },
          },
        },
      ];

      const result = convertContent(content);

      expect(result[0]!.type).toBe("tool-call");
      const parsed = JSON.parse((result[0] as { args: string }).args);
      expect(parsed.query).toBe("test");
      expect(parsed.filters.category).toEqual(["a", "b"]);
    });
  });

  describe("convertStopReason", () => {
    it("should convert 'end_turn' to 'stop'", () => {
      expect(convertStopReason("end_turn")).toBe("stop");
    });

    it("should convert 'stop_sequence' to 'stop'", () => {
      expect(convertStopReason("stop_sequence")).toBe("stop");
    });

    it("should convert 'max_tokens' to 'length'", () => {
      expect(convertStopReason("max_tokens")).toBe("length");
    });

    it("should convert 'tool_use' to 'tool-calls'", () => {
      expect(convertStopReason("tool_use")).toBe("tool-calls");
    });

    it("should convert null to 'other'", () => {
      expect(convertStopReason(null)).toBe("other");
    });

    it("should convert unknown reason to 'other'", () => {
      expect(convertStopReason("unknown_reason")).toBe("other");
    });
  });
});
