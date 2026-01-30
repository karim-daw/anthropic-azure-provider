import AnthropicFoundry from "@anthropic-ai/foundry-sdk";
import type {
  IAzureAnthropicProviderOptions,
  AzureAnthropicModelId,
  IAzureAnthropicModelOptions,
} from "./types.js";
import { AzureAnthropicLanguageModel } from "./model.js";
import { AzureAnthropicError } from "./errors.js";

/**
 * Azure Anthropic provider interface.
 * Callable as a function or via the languageModel method.
 */
export interface IAzureAnthropicProvider {
  /**
   * Create a language model instance for the specified model.
   */
  (modelId: AzureAnthropicModelId, options?: IAzureAnthropicModelOptions): AzureAnthropicLanguageModel;

  /**
   * Create a language model with explicit method call.
   */
  languageModel(modelId: AzureAnthropicModelId, options?: IAzureAnthropicModelOptions): AzureAnthropicLanguageModel;
}

/**
 * Create an Azure Anthropic provider instance.
 *
 * @param providerOptions - Configuration options for the provider
 * @returns A provider function that creates language models
 *
 * @example
 * ```typescript
 * import { createAzureAnthropic } from 'anthropic-azure-provider';
 * import { generateText } from 'ai';
 *
 * const provider = createAzureAnthropic({
 *   baseURL: process.env.AZURE_ANTHROPIC_BASE_URL,
 *   apiKey: process.env.AZURE_ANTHROPIC_API_KEY,
 * });
 *
 * const { text } = await generateText({
 *   model: provider('claude-sonnet-4-5-20251001'),
 *   prompt: 'Hello!',
 * });
 * ```
 */
export function createAzureAnthropic(
  providerOptions: IAzureAnthropicProviderOptions
): IAzureAnthropicProvider {
  // Validate required options
  if (!providerOptions.baseURL) {
    throw new AzureAnthropicError("validation", "baseURL is required");
  }

  if (!providerOptions.apiKey) {
    throw new AzureAnthropicError("validation", "apiKey is required");
  }

  // Create Foundry client
  const client = new AnthropicFoundry({
    apiKey: providerOptions.apiKey,
    baseURL: providerOptions.baseURL,
    defaultHeaders: providerOptions.headers,
  });

  const createModel = (
    modelId: AzureAnthropicModelId,
    options: IAzureAnthropicModelOptions = {}
  ) => new AzureAnthropicLanguageModel(modelId, client, options);

  const provider = createModel as IAzureAnthropicProvider;
  provider.languageModel = createModel;

  return provider;
}
