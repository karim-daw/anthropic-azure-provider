import type {
  LanguageModelV3FunctionTool,
  LanguageModelV3ToolChoice,
} from "@ai-sdk/provider";
import type {
  IAnthropicMessage,
  IAnthropicContentBlock,
  IAnthropicTextBlock,
  IAnthropicImageBlock,
  IAnthropicToolUseBlock,
  IAnthropicToolResultBlock,
  IAnthropicTool,
  IAnthropicResponseContentBlock,
} from "./types.js";
import { AzureAnthropicError } from "./errors.js";

/**
 * Result of converting a V3 prompt to Anthropic format.
 */
export interface IConvertedPrompt {
  readonly system: string | undefined;
  readonly messages: ReadonlyArray<IAnthropicMessage>;
}

interface IV3Message {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: string | ReadonlyArray<IV3ContentPart>;
}

interface IV3ContentPart {
  readonly type: string;
  readonly text?: string;
  readonly data?: string | Uint8Array;
  readonly mediaType?: string;
  readonly toolCallId?: string;
  readonly toolName?: string;
  readonly args?: string | Record<string, unknown>;
  readonly result?: unknown;
  readonly isError?: boolean;
}

/**
 * Content part from AI SDK V3 prompt.
 */
interface ITextPart {
  readonly type: "text";
  readonly text: string;
}

interface IFilePart {
  readonly type: "file";
  readonly data: string | Uint8Array;
  readonly mediaType: string;
}

interface IToolCallPart {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: string | Record<string, unknown>;
}

type ContentPart = ITextPart | IFilePart | IToolCallPart;

interface IV3TextContent {
  readonly type: "text";
  readonly text: string;
}

interface IV3ToolCallContent {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: string;
}

export type IV3Content = IV3TextContent | IV3ToolCallContent;

export type IV3FinishReason =
  | "stop"
  | "length"
  | "content-filter"
  | "tool-calls"
  | "error"
  | "other";

/**
 * Anthropic tool choice format.
 */
interface IAnthropicToolChoice {
  readonly type: "auto" | "any" | "tool";
  readonly name?: string;
}

const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

/**
 * Convert V3 prompt to Anthropic messages format.
 */
export function convertPrompt(
  prompt: ReadonlyArray<IV3Message>
): IConvertedPrompt {
  let system: string | undefined;
  const messages: IAnthropicMessage[] = [];

  for (const message of prompt) {
    switch (message.role) {
      case "system":
        system = extractSystemContent(message);
        break;

      case "user":
        messages.push({
          role: "user",
          content: convertContentForRole(message.content, "user"),
        });
        break;

      case "assistant":
        messages.push({
          role: "assistant",
          content: convertContentForRole(message.content, "assistant"),
        });
        break;

      case "tool":
        messages.push(convertToolResultMessage(message));
        break;
    }
  }

  // Merge consecutive messages of the same role (Anthropic requirement)
  const mergedMessages = mergeConsecutiveMessages(messages);

  return { system, messages: mergedMessages };
}

/**
 * Convert Anthropic response content blocks to V3 format.
 */
export function convertContent(
  content: ReadonlyArray<IAnthropicResponseContentBlock>
): IV3Content[] {
  return content.map((block) =>
    block.type === "text"
      ? { type: "text" as const, text: block.text }
      : {
          type: "tool-call" as const,
          toolCallId: block.id,
          toolName: block.name,
          args: JSON.stringify(block.input),
        }
  );
}

/**
 * Convert Anthropic stop reason to V3 finish reason.
 */
export function convertStopReason(reason: string | null): IV3FinishReason {
  switch (reason) {
    case "end_turn":
    case "stop_sequence":
      return "stop";
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool-calls";
    default:
      return "other";
  }
}

/**
 * Convert V3 function tools to Anthropic tool format.
 */
export function convertTools(
  tools: ReadonlyArray<LanguageModelV3FunctionTool>
): IAnthropicTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    input_schema: tool.inputSchema as Record<string, unknown>,
    ...(tool.description !== undefined && { description: tool.description }),
  }));
}

/**
 * Convert V3 tool choice to Anthropic format.
 */
export function convertToolChoice(
  choice: LanguageModelV3ToolChoice
): IAnthropicToolChoice {
  switch (choice.type) {
    case "auto":
      return { type: "auto" };
    case "none":
      // Anthropic doesn't have a "none" type, use auto as fallback
      return { type: "auto" };
    case "required":
      return { type: "any" };
    case "tool":
      return {
        type: "tool",
        name: choice.toolName,
      };
    default:
      return { type: "auto" };
  }
}

// Private helper functions

function extractSystemContent(message: IV3Message): string {
  if (typeof message.content === "string") {
    return message.content;
  }

  return message.content
    .filter(
      (part): part is IV3ContentPart & { text: string } =>
        part.type === "text" && typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("\n");
}

function convertToolResultMessage(message: IV3Message): IAnthropicMessage {
  const content: IAnthropicToolResultBlock[] = [];

  if (typeof message.content === "string") {
    return { role: "user", content: message.content };
  }

  for (const part of message.content) {
    if (part.type === "tool-result" && part.toolCallId) {
      const resultContent =
        typeof part.result === "string"
          ? part.result
          : JSON.stringify(part.result);

      const toolResultBlock: IAnthropicToolResultBlock = {
        type: "tool_result",
        tool_use_id: part.toolCallId,
        content: resultContent,
        ...(part.isError !== undefined && { is_error: part.isError }),
      };

      content.push(toolResultBlock);
    }
  }

  return { role: "user", content };
}

function convertContentForRole(
  content: string | ReadonlyArray<IV3ContentPart>,
  role: "user" | "assistant"
): string | IAnthropicContentBlock[] {
  if (typeof content === "string") {
    return content;
  }

  const blocks: IAnthropicContentBlock[] = [];
  for (const part of content) {
    const converted = convertContentPart(part as ContentPart, role);
    blocks.push(converted);
  }

  // Simplify to string if only one text block
  if (blocks.length === 1 && blocks[0]!.type === "text") {
    return blocks[0]!.text;
  }

  return blocks;
}

function convertContentPart(
  part: ContentPart,
  role: "user" | "assistant"
): IAnthropicContentBlock {
  switch (part.type) {
    case "text":
      return { type: "text", text: part.text };
    case "file":
      if (role === "user") {
        return convertFilePart(part);
      }
      throw new AzureAnthropicError(
        "conversion",
        `Unsupported assistant content part type: ${part.type}`
      );
    case "tool-call":
      if (role === "assistant") {
        return convertToolCallPart(part);
      }
      throw new AzureAnthropicError(
        "conversion",
        `Unsupported user content part type: ${part.type}`
      );
    default:
      throw new AzureAnthropicError(
        "conversion",
        `Unsupported ${role} content part type: ${
          (part as { type: string }).type
        }`
      );
  }
}

function convertFilePart(part: IFilePart): IAnthropicImageBlock {
  const mediaType = validateImageMediaType(part.mediaType);
  const data = extractBase64Data(part.data);

  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mediaType,
      data: data,
    },
  };
}

function convertToolCallPart(part: IToolCallPart): IAnthropicToolUseBlock {
  let input: unknown;
  if (typeof part.args === "string") {
    try {
      input = JSON.parse(part.args);
    } catch {
      input = {};
    }
  } else {
    input = part.args;
  }

  return {
    type: "tool_use",
    id: part.toolCallId,
    name: part.toolName,
    input: input,
  };
}

function validateImageMediaType(mediaType: string): SupportedImageType {
  if (!SUPPORTED_IMAGE_TYPES.includes(mediaType as SupportedImageType)) {
    throw new AzureAnthropicError(
      "conversion",
      `Unsupported image media type: ${mediaType}. Supported: ${SUPPORTED_IMAGE_TYPES.join(
        ", "
      )}`
    );
  }
  return mediaType as SupportedImageType;
}

function extractBase64Data(data: string | Uint8Array): string {
  if (data instanceof Uint8Array) {
    // Use Buffer for efficient base64 encoding in Node.js
    if (typeof Buffer !== "undefined") {
      return Buffer.from(data).toString("base64");
    }
    // Fallback for browser environments
    let binary = "";
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]!);
    }
    return btoa(binary);
  }

  if (typeof data === "string") {
    // Handle data URL format: data:image/png;base64,iVBORw0KG...
    if (data.startsWith("data:")) {
      const commaIndex = data.indexOf(",");
      if (commaIndex !== -1) {
        return data.substring(commaIndex + 1);
      }
    }
    // Assume already base64
    return data;
  }

  throw new AzureAnthropicError("conversion", "Invalid file data format");
}

function mergeConsecutiveMessages(
  messages: IAnthropicMessage[]
): IAnthropicMessage[] {
  const merged: IAnthropicMessage[] = [];

  for (const message of messages) {
    const lastMessage = merged[merged.length - 1];

    if (lastMessage && lastMessage.role === message.role) {
      // Merge content arrays
      const lastContent = normalizeContent(lastMessage.content);
      const currentContent = normalizeContent(message.content);

      merged[merged.length - 1] = {
        role: message.role,
        content: [...lastContent, ...currentContent],
      };
    } else {
      merged.push(message);
    }
  }

  return merged;
}

function normalizeContent(
  content: string | ReadonlyArray<IAnthropicContentBlock>
): IAnthropicContentBlock[] {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  return [...content];
}
