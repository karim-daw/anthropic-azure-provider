/**
 * Configuration options for the Azure Anthropic provider.
 */
export interface IAzureAnthropicProviderOptions {
  /**
   * Base URL for the Azure Anthropic Foundry endpoint.
   * Example: "https://my-resource.services.ai.azure.com/anthropic"
   */
  readonly baseURL: string;

  /**
   * API key for authentication with Azure Anthropic Foundry.
   */
  readonly apiKey: string;

  /**
   * Optional custom headers to include with all requests.
   */
  readonly headers?: Record<string, string>;
}

/**
 * Supported Claude model identifiers on Azure Foundry.
 * Includes common models and allows custom model IDs.
 */
export type AzureAnthropicModelId =
  | "claude-opus-4-5-20251001"
  | "claude-sonnet-4-5-20251001"
  | "claude-haiku-4-5-20251001"
  | "claude-opus-4-1-20251001"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-haiku-20241022"
  | "claude-3-opus-20240229"
  | "claude-3-sonnet-20240229"
  | "claude-3-haiku-20240307"
  | (string & {});

/**
 * Model-specific configuration options.
 */
export interface IAzureAnthropicModelOptions {
  /**
   * Maximum number of tokens to generate.
   * Default: 4096
   */
  readonly maxOutputTokens?: number;
}

/**
 * Anthropic API message format.
 */
export interface IAnthropicMessage {
  readonly role: "user" | "assistant";
  readonly content: string | ReadonlyArray<IAnthropicContentBlock>;
}

/**
 * Union type for all Anthropic content block types.
 */
export type IAnthropicContentBlock =
  | IAnthropicTextBlock
  | IAnthropicImageBlock
  | IAnthropicToolUseBlock
  | IAnthropicToolResultBlock;

export interface IAnthropicTextBlock {
  readonly type: "text";
  readonly text: string;
}

export interface IAnthropicImageBlock {
  readonly type: "image";
  readonly source: {
    readonly type: "base64";
    readonly media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    readonly data: string;
  };
}

export interface IAnthropicToolUseBlock {
  readonly type: "tool_use";
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
}

export interface IAnthropicToolResultBlock {
  readonly type: "tool_result";
  readonly tool_use_id: string;
  readonly content: string;
  readonly is_error?: boolean;
}

export interface IAnthropicTool {
  readonly name: string;
  readonly description?: string;
  readonly input_schema: Record<string, unknown>;
}

/**
 * Anthropic API response content block types.
 */
export type IAnthropicResponseContentBlock =
  | IAnthropicTextBlock
  | IAnthropicToolUseBlock;

/**
 * Anthropic API response structure.
 */
export interface IAnthropicResponse {
  readonly id: string;
  readonly model: string;
  readonly content: ReadonlyArray<IAnthropicResponseContentBlock>;
  readonly stop_reason: string | null;
  readonly usage: {
    readonly input_tokens: number;
    readonly output_tokens: number;
    readonly cache_read_input_tokens?: number;
  };
}

export interface IAnthropicContentBlockStartEvent {
  readonly type: "content_block_start";
  readonly index: number;
  readonly content_block: {
    readonly type: "text" | "tool_use";
    readonly id?: string;
    readonly name?: string;
    readonly text?: string;
  };
}

/**
 * Anthropic streaming event: content_block_delta
 */
export interface IAnthropicContentBlockDeltaEvent {
  readonly type: "content_block_delta";
  readonly index: number;
  readonly delta: {
    readonly type: "text_delta" | "input_json_delta";
    readonly text?: string;
    readonly partial_json?: string;
  };
}

export interface IAnthropicContentBlockStopEvent {
  readonly type: "content_block_stop";
  readonly index: number;
}

/**
 * Anthropic streaming event: message_start
 */
export interface IAnthropicMessageStartEvent {
  readonly type: "message_start";
  readonly message?: {
    readonly usage?: {
      readonly input_tokens?: number;
    };
  };
}

export interface IAnthropicMessageDeltaEvent {
  readonly type: "message_delta";
  readonly delta?: {
    readonly stop_reason?: string | null;
  };
  readonly usage?: {
    readonly output_tokens?: number;
  };
}

/**
 * Union type for all Anthropic streaming events.
 */
export type IAnthropicStreamEvent =
  | IAnthropicContentBlockStartEvent
  | IAnthropicContentBlockDeltaEvent
  | IAnthropicContentBlockStopEvent
  | IAnthropicMessageStartEvent
  | IAnthropicMessageDeltaEvent;
