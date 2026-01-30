// Provider factory
export { createAzureAnthropic } from "./provider.js";
export type { IAzureAnthropicProvider } from "./provider.js";

// Types
export type {
  IAzureAnthropicProviderOptions,
  AzureAnthropicModelId,
  IAzureAnthropicModelOptions,
} from "./types.js";

// Model class (for advanced use cases)
export { AzureAnthropicLanguageModel } from "./model.js";

// Errors
export { AzureAnthropicError } from "./errors.js";
