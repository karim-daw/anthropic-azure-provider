import { describe, it, expect } from "vitest";
import { convertPrompt } from "../../src/converters.js";
import { AzureAnthropicError } from "../../src/errors.js";

describe("Content conversion through convertPrompt", () => {
  describe("user content conversion", () => {
    it("should convert text part", () => {
      const prompt = [
        {
          role: "user" as const,
          content: [{ type: "text" as const, text: "Hello, world!" }],
        },
      ];

      const result = convertPrompt(prompt);

      // Single text block is simplified to string
      expect(result.messages[0]!.content).toBe("Hello, world!");
    });

    it("should convert file part with base64 data", () => {
      const prompt = [
        {
          role: "user" as const,
          content: [
            {
              type: "file" as const,
              data: "iVBORw0KGgo=",
              mediaType: "image/png",
            },
          ],
        },
      ];

      const result = convertPrompt(prompt);

      const content = result.messages[0]!.content as Array<{
        type: string;
        source?: { media_type: string; data: string };
      }>;
      expect(content[0]!.type).toBe("image");
      expect(content[0]!.source!.media_type).toBe("image/png");
      expect(content[0]!.source!.data).toBe("iVBORw0KGgo=");
    });

    it("should convert file part with data URL", () => {
      const prompt = [
        {
          role: "user" as const,
          content: [
            {
              type: "file" as const,
              data: "data:image/jpeg;base64,/9j/4AAQ",
              mediaType: "image/jpeg",
            },
          ],
        },
      ];

      const result = convertPrompt(prompt);

      const content = result.messages[0]!.content as Array<{
        source?: { media_type: string; data: string };
      }>;
      expect(content[0]!.source!.media_type).toBe("image/jpeg");
      expect(content[0]!.source!.data).toBe("/9j/4AAQ");
    });

    it("should convert file part with Uint8Array", () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const prompt = [
        {
          role: "user" as const,
          content: [
            {
              type: "file" as const,
              data: bytes,
              mediaType: "image/png",
            },
          ],
        },
      ];

      const result = convertPrompt(prompt);

      const content = result.messages[0]!.content as Array<{
        source?: { data: string };
      }>;
      expect(content[0]!.source!.data).toBe("SGVsbG8="); // Base64 of "Hello"
    });

    it("should throw for unsupported image media type", () => {
      const prompt = [
        {
          role: "user" as const,
          content: [
            {
              type: "file" as const,
              data: "data",
              mediaType: "image/bmp",
            },
          ],
        },
      ];

      expect(() => convertPrompt(prompt)).toThrow(AzureAnthropicError);
      expect(() => convertPrompt(prompt)).toThrow("Unsupported image media type");
    });

    it("should throw for unsupported content part type", () => {
      const prompt = [
        {
          role: "user" as const,
          content: [{ type: "unknown" as const }],
        },
      ];

      expect(() => convertPrompt(prompt as never)).toThrow(AzureAnthropicError);
      expect(() => convertPrompt(prompt as never)).toThrow("Unsupported user content part type");
    });

    it("should support all valid image types", () => {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

      for (const mediaType of validTypes) {
        const prompt = [
          {
            role: "user" as const,
            content: [
              {
                type: "file" as const,
                data: "test",
                mediaType,
              },
            ],
          },
        ];

        const result = convertPrompt(prompt);
        const content = result.messages[0]!.content as Array<{
          source?: { media_type: string };
        }>;
        expect(content[0]!.source!.media_type).toBe(mediaType);
      }
    });
  });

  describe("assistant content conversion", () => {
    it("should convert text part", () => {
      const prompt = [
        {
          role: "assistant" as const,
          content: [{ type: "text" as const, text: "Response text" }],
        },
      ];

      const result = convertPrompt(prompt);

      // Single text block is simplified to string
      expect(result.messages[0]!.content).toBe("Response text");
    });

    it("should convert tool-call part with string args", () => {
      const prompt = [
        {
          role: "assistant" as const,
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "call_123",
              toolName: "get_weather",
              args: '{"location": "NYC"}',
            },
          ],
        },
      ];

      const result = convertPrompt(prompt);

      const content = result.messages[0]!.content as Array<{
        type: string;
        id?: string;
        name?: string;
        input?: unknown;
      }>;
      expect(content[0]!.type).toBe("tool_use");
      expect(content[0]!.id).toBe("call_123");
      expect(content[0]!.name).toBe("get_weather");
      expect(content[0]!.input).toEqual({ location: "NYC" });
    });

    it("should convert tool-call part with object args", () => {
      const prompt = [
        {
          role: "assistant" as const,
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "call_456",
              toolName: "search",
              args: { query: "test" },
            },
          ],
        },
      ];

      const result = convertPrompt(prompt);

      const content = result.messages[0]!.content as Array<{
        input?: unknown;
      }>;
      expect(content[0]!.input).toEqual({ query: "test" });
    });

    it("should handle invalid JSON in tool-call args", () => {
      const prompt = [
        {
          role: "assistant" as const,
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "call_789",
              toolName: "test",
              args: "invalid json",
            },
          ],
        },
      ];

      const result = convertPrompt(prompt);

      const content = result.messages[0]!.content as Array<{
        input?: unknown;
      }>;
      expect(content[0]!.input).toEqual({});
    });

    it("should throw for unsupported assistant content part type", () => {
      const prompt = [
        {
          role: "assistant" as const,
          content: [
            {
              type: "file" as const,
              data: "test",
              mediaType: "image/png",
            },
          ],
        },
      ];

      expect(() => convertPrompt(prompt as never)).toThrow(AzureAnthropicError);
      expect(() => convertPrompt(prompt as never)).toThrow("Unsupported assistant content part type");
    });
  });
});
