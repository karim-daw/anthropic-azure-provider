import type { LanguageModelV3StreamPart } from "@ai-sdk/provider";
import type { IAnthropicStreamEvent } from "./types.js";
import { convertStopReason } from "./converters.js";

interface StreamState {
  toolCalls: Map<
    number,
    { id: string; name: string; argsText: string }
  >;
  textBlockIds: Set<number>;
  inputTokens: number;
  outputTokens: number;
  finishReasonRaw: string;
}

/**
 * Process an Anthropic stream into V3 stream parts.
 */
export function processStream(
  anthropicStream: AsyncIterable<IAnthropicStreamEvent>
): ReadableStream<LanguageModelV3StreamPart> {
  const state: StreamState = {
    toolCalls: new Map(),
    textBlockIds: new Set(),
    inputTokens: 0,
    outputTokens: 0,
    finishReasonRaw: "other",
  };

  let hasEmittedStart = false;

  return new ReadableStream<LanguageModelV3StreamPart>({
    async start(controller) {
      try {
        for await (const event of anthropicStream) {
          if (!hasEmittedStart) {
            controller.enqueue({
              type: "stream-start",
              warnings: [],
            });
            hasEmittedStart = true;
          }

          const parts = processStreamEvent(event, state);

          for (const part of parts) {
            controller.enqueue(part);
          }
        }

        const unified = convertStopReason(state.finishReasonRaw);
        controller.enqueue({
          type: "finish",
          finishReason: { unified, raw: state.finishReasonRaw },
          usage: {
            inputTokens: {
              total: state.inputTokens,
              noCache: undefined,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: {
              total: state.outputTokens,
              text: state.outputTokens,
              reasoning: undefined,
            },
          },
        });
      } catch (error) {
        controller.enqueue({
          type: "error",
          error,
        });
      } finally {
        controller.close();
      }
    },
  });
}

function processStreamEvent(
  event: IAnthropicStreamEvent,
  state: StreamState
): LanguageModelV3StreamPart[] {
  const parts: LanguageModelV3StreamPart[] = [];

  switch (event.type) {
    case "message_start": {
      const inputTokens = event.message?.usage?.input_tokens;
      if (inputTokens !== undefined) {
        state.inputTokens = inputTokens;
      }
      break;
    }

    case "content_block_start": {
      const block = event.content_block;
      if (block.type === "text") {
        const id = `text-${event.index}`;
        state.textBlockIds.add(event.index);
        parts.push({ type: "text-start", id });
      }
      if (block.type === "tool_use" && block.id && block.name) {
        state.toolCalls.set(event.index, {
          id: block.id,
          name: block.name,
          argsText: "",
        });
      }
      break;
    }

    case "content_block_delta": {
      const delta = event.delta;

      if (delta.type === "text_delta" && delta.text !== undefined) {
        const index = event.index;
        const id = `text-${index}`;
        if (!state.textBlockIds.has(index)) {
          state.textBlockIds.add(index);
          parts.push({ type: "text-start", id });
        }
        parts.push({ type: "text-delta", id, delta: delta.text });
      }

      if (delta.type === "input_json_delta" && delta.partial_json) {
        const toolCall = state.toolCalls.get(event.index);
        if (toolCall) {
          toolCall.argsText += delta.partial_json;
        }
      }
      break;
    }

    case "content_block_stop": {
      const index = event.index;
      if (state.textBlockIds.has(index)) {
        parts.push({ type: "text-end", id: `text-${index}` });
      }
      const toolCall = state.toolCalls.get(index);
      if (toolCall) {
        state.toolCalls.delete(index);
        parts.push({
          type: "tool-call",
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          input: toolCall.argsText || "{}",
        });
      }
      break;
    }

    case "message_delta": {
      const outputTokens = event.usage?.output_tokens;
      if (outputTokens !== undefined) {
        state.outputTokens = outputTokens;
      }
      const stopReason = event.delta?.stop_reason;
      if (stopReason !== undefined && stopReason !== null) {
        state.finishReasonRaw = stopReason;
      }
      break;
    }
  }

  return parts;
}

