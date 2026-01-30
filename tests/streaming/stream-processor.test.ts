import { describe, it, expect } from "vitest";
import { processStream } from "../../src/stream.js";
import type { IAnthropicStreamEvent } from "../../src/types.js";

describe("processStream", () => {

  async function collectStreamParts(
    stream: ReadableStream<unknown>
  ): Promise<unknown[]> {
    const reader = stream.getReader();
    const parts: unknown[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
    }

    return parts;
  }

  async function* createAsyncIterable(
    events: IAnthropicStreamEvent[]
  ): AsyncIterable<IAnthropicStreamEvent> {
    for (const event of events) {
      yield event;
    }
  }

  describe("processStream", () => {
    it("should emit stream-start as first event", async () => {
      const events: IAnthropicStreamEvent[] = [
        { type: "message_start", message: { usage: { input_tokens: 10 } } },
      ];

      const stream = processStream(createAsyncIterable(events));
      const parts = await collectStreamParts(stream);

      expect(parts[0]).toEqual({
        type: "stream-start",
        warnings: [],
      });
    });

    it("should emit text-start, text-delta, text-end for text_delta events", async () => {
      const events: IAnthropicStreamEvent[] = [
        { type: "message_start", message: { usage: { input_tokens: 10 } } },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "Hello" },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: " world" },
        },
        { type: "content_block_stop", index: 0 },
      ];

      const stream = processStream(createAsyncIterable(events));
      const parts = await collectStreamParts(stream);

      const textStart = parts.find((p: unknown) => (p as { type: string }).type === "text-start");
      const textDeltas = parts.filter((p: unknown) => (p as { type: string }).type === "text-delta");
      const textEnd = parts.find((p: unknown) => (p as { type: string }).type === "text-end");

      expect(textStart).toEqual({ type: "text-start", id: "text-0" });
      expect(textDeltas).toHaveLength(2);
      expect(textDeltas[0]).toEqual({ type: "text-delta", id: "text-0", delta: "Hello" });
      expect(textDeltas[1]).toEqual({ type: "text-delta", id: "text-0", delta: " world" });
      expect(textEnd).toEqual({ type: "text-end", id: "text-0" });
    });

    it("should accumulate and emit tool calls", async () => {
      const events: IAnthropicStreamEvent[] = [
        { type: "message_start", message: { usage: { input_tokens: 10 } } },
        {
          type: "content_block_start",
          index: 0,
          content_block: { type: "tool_use", id: "call_123", name: "get_weather" },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "input_json_delta", partial_json: '{"loc' },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "input_json_delta", partial_json: 'ation":"NYC"}' },
        },
        { type: "content_block_stop", index: 0 },
      ];

      const stream = processStream(createAsyncIterable(events));
      const parts = await collectStreamParts(stream);

      const toolCallParts = parts.filter((p: unknown) => (p as { type: string }).type === "tool-call");
      expect(toolCallParts).toHaveLength(1);
      expect(toolCallParts[0]).toEqual({
        type: "tool-call",
        toolCallId: "call_123",
        toolName: "get_weather",
        input: '{"location":"NYC"}',
      });
    });

    it("should emit finish event with usage", async () => {
      const events: IAnthropicStreamEvent[] = [
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "Response" },
        },
        {
          type: "message_delta",
          delta: { stop_reason: "end_turn" },
          usage: { output_tokens: 50 },
        },
      ];

      const stream = processStream(createAsyncIterable(events));
      const parts = await collectStreamParts(stream);

      const finishPart = parts.find((p: unknown) => (p as { type: string }).type === "finish");
      expect(finishPart).toMatchObject({
        type: "finish",
        finishReason: { unified: "stop", raw: "end_turn" },
        usage: {
          inputTokens: { total: 100 },
          outputTokens: { total: 50, text: 50 },
        },
      });
    });

    it("should convert stop reasons correctly", async () => {
      const testCases = [
        { reason: "end_turn", expected: "stop" },
        { reason: "stop_sequence", expected: "stop" },
        { reason: "max_tokens", expected: "length" },
        { reason: "tool_use", expected: "tool-calls" },
      ];

      for (const { reason, expected } of testCases) {
        const events: IAnthropicStreamEvent[] = [
          { type: "message_start", message: { usage: { input_tokens: 10 } } },
          {
            type: "message_delta",
            delta: { stop_reason: reason },
            usage: { output_tokens: 5 },
          },
        ];

        const stream = processStream(createAsyncIterable(events));
        const parts = await collectStreamParts(stream);

        const finishPart = parts.find((p: unknown) => (p as { type: string }).type === "finish") as {
          finishReason: { unified: string };
        };
        expect(finishPart.finishReason.unified).toBe(expected);
      }
    });

    it("should handle multiple tool calls", async () => {
      const events: IAnthropicStreamEvent[] = [
        { type: "message_start", message: { usage: { input_tokens: 10 } } },
        {
          type: "content_block_start",
          index: 0,
          content_block: { type: "tool_use", id: "call_1", name: "tool_a" },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "input_json_delta", partial_json: '{"a":1}' },
        },
        { type: "content_block_stop", index: 0 },
        {
          type: "content_block_start",
          index: 1,
          content_block: { type: "tool_use", id: "call_2", name: "tool_b" },
        },
        {
          type: "content_block_delta",
          index: 1,
          delta: { type: "input_json_delta", partial_json: '{"b":2}' },
        },
        { type: "content_block_stop", index: 1 },
      ];

      const stream = processStream(createAsyncIterable(events));
      const parts = await collectStreamParts(stream);

      const toolCallParts = parts.filter((p: unknown) => (p as { type: string }).type === "tool-call") as Array<{ toolCallId: string }>;
      expect(toolCallParts).toHaveLength(2);
      expect(toolCallParts[0]!.toolCallId).toBe("call_1");
      expect(toolCallParts[1]!.toolCallId).toBe("call_2");
    });

    it("should handle mixed text and tool calls", async () => {
      const events: IAnthropicStreamEvent[] = [
        { type: "message_start", message: { usage: { input_tokens: 10 } } },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "Let me help." },
        },
        {
          type: "content_block_start",
          index: 1,
          content_block: { type: "tool_use", id: "call_123", name: "search" },
        },
        {
          type: "content_block_delta",
          index: 1,
          delta: { type: "input_json_delta", partial_json: '{}' },
        },
        { type: "content_block_stop", index: 1 },
        {
          type: "message_delta",
          delta: { stop_reason: "tool_use" },
          usage: { output_tokens: 20 },
        },
      ];

      const stream = processStream(createAsyncIterable(events));
      const parts = await collectStreamParts(stream);

      const types = parts.map((p: unknown) => (p as { type: string }).type);
      expect(types).toContain("stream-start");
      expect(types).toContain("text-delta");
      expect(types).toContain("tool-call");
      expect(types).toContain("finish");
    });

    it("should emit error part on stream error", async () => {
      async function* errorStream(): AsyncIterable<IAnthropicStreamEvent> {
        yield { type: "message_start", message: { usage: { input_tokens: 10 } } };
        throw new Error("Stream error");
      }

      const stream = processStream(errorStream());
      const parts = await collectStreamParts(stream);

      const errorPart = parts.find((p: unknown) => (p as { type: string }).type === "error") as { error: Error };
      expect(errorPart).toBeDefined();
      expect(errorPart.error.message).toBe("Stream error");
    });

    it("should handle empty stream", async () => {
      const events: IAnthropicStreamEvent[] = [];

      const stream = processStream(createAsyncIterable(events));
      const parts = await collectStreamParts(stream);

      // Should only have finish event (no stream-start since no events)
      expect(parts).toHaveLength(1);
      expect((parts[0] as { type: string }).type).toBe("finish");
    });

    it("should handle content_block_stop without active tool call", async () => {
      const events: IAnthropicStreamEvent[] = [
        { type: "message_start", message: { usage: { input_tokens: 10 } } },
        { type: "content_block_stop", index: 0 }, // No matching start
      ];

      const stream = processStream(createAsyncIterable(events));
      const parts = await collectStreamParts(stream);

      // Should not emit tool-call
      const toolCallParts = parts.filter((p: unknown) => (p as { type: string }).type === "tool-call");
      expect(toolCallParts).toHaveLength(0);
    });
  });
});
