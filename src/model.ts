import type AnthropicFoundry from "@anthropic-ai/foundry-sdk";
import type {
  LanguageModelV3CallOptions,
  LanguageModelV3FunctionTool,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamResult,
} from "@ai-sdk/provider";
import type {
  AzureAnthropicModelId,
  IAzureAnthropicModelOptions,
  IAnthropicStreamEvent,
  IAnthropicResponse,
} from "./types.js";
import {
  convertPrompt,
  convertContent,
  convertStopReason,
  convertTools,
  convertToolChoice,
  type IV3FinishReason,
} from "./converters.js";
import { processStream } from "./stream.js";


/**
 * Azure Anthropic Language Model implementing LanguageModelV3 specification.
 */
export class AzureAnthropicLanguageModel {
  public readonly specificationVersion = "v3" as const;
  public readonly provider = "azure-anthropic";
  public readonly defaultObjectGenerationMode = "tool" as const;

  /**
   * URL patterns supported by this model.
   * Empty for Azure Anthropic as it doesn't support URL-based content fetching.
   */
  public readonly supportedUrls: Record<string, RegExp[]> = {};

  public readonly modelId: string;

  private readonly client: AnthropicFoundry;
  private readonly options: IAzureAnthropicModelOptions;

  constructor(
    modelId: AzureAnthropicModelId,
    client: AnthropicFoundry,
    options: IAzureAnthropicModelOptions = {}
  ) {
    this.modelId = modelId;
    this.client = client;
    this.options = options;
  }

  /**
   * Generate a complete response (non-streaming).
   */
  public async doGenerate(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3GenerateResult> {
    const requestBody = this.buildRequestBody(options, false);

    const response = (await this.client.messages.create(
      requestBody as Parameters<typeof this.client.messages.create>[0],
      { signal: options.abortSignal }
    )) as unknown as IAnthropicResponse;

    const content = convertContent(response.content);
    const finishReasonUnified = convertStopReason(response.stop_reason);

    const result: LanguageModelV3GenerateResult = {
      content: content.map((part) =>
        part.type === "tool-call"
          ? {
              type: "tool-call" as const,
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              input: part.args,
            }
          : part
      ),
      finishReason: {
        unified: finishReasonUnified,
        raw: response.stop_reason ?? undefined,
      },
      usage: {
        inputTokens: {
          total: response.usage.input_tokens,
          noCache: undefined,
          cacheRead: response.usage.cache_read_input_tokens,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: response.usage.output_tokens,
          text: response.usage.output_tokens,
          reasoning: undefined,
        },
      },
      warnings: [],
      request: { body: requestBody },
      response: {
        id: response.id,
        modelId: response.model,
        timestamp: new Date(),
        body: response,
      },
    };
    return result;
  }

  /**
   * Generate a streaming response.
   */
  public async doStream(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3StreamResult> {
    const requestBody = this.buildRequestBody(options, true);

    const anthropicStream = (await this.client.messages.create(
      requestBody as Parameters<typeof this.client.messages.create>[0],
      { signal: options.abortSignal }
    )) as unknown as AsyncIterable<IAnthropicStreamEvent>;

    const stream = processStream(anthropicStream);

    return {
      stream,
      request: { body: requestBody },
    };
  }

  private buildRequestBody(
    options: LanguageModelV3CallOptions,
    isStreaming: boolean
  ) {
    const convertedPrompt = convertPrompt(
      options.prompt as Parameters<typeof convertPrompt>[0]
    );

    const functionTools = options.tools?.filter(
      (t): t is LanguageModelV3FunctionTool => t.type === "function"
    );
    const anthropicTools =
      functionTools && functionTools.length > 0 ? convertTools(functionTools) : undefined;

    const anthropicToolChoice =
      options.toolChoice !== undefined
        ? convertToolChoice(options.toolChoice)
        : undefined;

    const maxTokens =
      options.maxOutputTokens ?? this.options.maxOutputTokens ?? 4096;

    return {
      model: this.modelId,
      max_tokens: maxTokens,
      messages: convertedPrompt.messages,
      ...(isStreaming && { stream: true }),
      ...(convertedPrompt.system && { system: convertedPrompt.system }),
      ...(options.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(options.topP !== undefined && { top_p: options.topP }),
      ...(options.topK !== undefined && { top_k: options.topK }),
      ...(options.stopSequences && { stop_sequences: options.stopSequences }),
      ...(anthropicTools && anthropicTools.length > 0 && { tools: anthropicTools }),
      ...(anthropicToolChoice && { tool_choice: anthropicToolChoice }),
    };
  }
}
