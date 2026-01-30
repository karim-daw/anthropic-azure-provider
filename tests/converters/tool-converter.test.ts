import { describe, it, expect } from "vitest";
import { convertTools, convertToolChoice } from "../../src/converters.js";

describe("convertTools", () => {
  describe("convertTools", () => {
    it("should convert a single tool", () => {
      const tools = [
        {
          type: "function" as const,
          name: "get_weather",
          description: "Get weather for a location",
          inputSchema: {
            type: "object",
            properties: {
              location: { type: "string" },
            },
            required: ["location"],
          },
        },
      ];

      const result = convertTools(tools);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: "get_weather",
        description: "Get weather for a location",
        input_schema: {
          type: "object",
          properties: {
            location: { type: "string" },
          },
          required: ["location"],
        },
      });
    });

    it("should convert multiple tools", () => {
      const tools = [
        {
          type: "function" as const,
          name: "tool_a",
          description: "First tool",
          inputSchema: { type: "object" },
        },
        {
          type: "function" as const,
          name: "tool_b",
          description: "Second tool",
          inputSchema: { type: "object" },
        },
      ];

      const result = convertTools(tools);

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe("tool_a");
      expect(result[1]!.name).toBe("tool_b");
    });

    it("should handle tool without description", () => {
      const tools = [
        {
          type: "function" as const,
          name: "simple_tool",
          inputSchema: { type: "object" },
        },
      ];

      const result = convertTools(tools);

      expect(result[0]!.name).toBe("simple_tool");
      expect(result[0]).not.toHaveProperty("description");
    });

    it("should handle tool with minimal inputSchema", () => {
      const tools = [
        {
          type: "function" as const,
          name: "no_params_tool",
          description: "A tool without parameters",
          inputSchema: { type: "object", properties: {} },
        },
      ];

      const result = convertTools(tools);

      expect(result[0]!.input_schema).toEqual({
        type: "object",
        properties: {},
      });
    });

    it("should handle empty tools array", () => {
      const result = convertTools([]);

      expect(result).toEqual([]);
    });
  });

  describe("convertToolChoice", () => {
    it("should convert 'auto' choice", () => {
      const result = convertToolChoice({ type: "auto" });

      expect(result).toEqual({ type: "auto" });
    });

    it("should convert 'none' choice to auto (Anthropic fallback)", () => {
      const result = convertToolChoice({ type: "none" });

      expect(result).toEqual({ type: "auto" });
    });

    it("should convert 'required' choice to 'any'", () => {
      const result = convertToolChoice({ type: "required" });

      expect(result).toEqual({ type: "any" });
    });

    it("should convert specific tool choice", () => {
      const result = convertToolChoice({
        type: "tool",
        toolName: "get_weather",
      });

      expect(result).toEqual({
        type: "tool",
        name: "get_weather",
      });
    });
  });
});
