import { describe, it, expect, vi } from "vitest";
import { createAzureAnthropic } from "../../src/provider.js";
import { AzureAnthropicError } from "../../src/errors.js";
import { AzureAnthropicLanguageModel } from "../../src/model.js";

// Mock the AnthropicFoundry SDK
vi.mock("@anthropic-ai/foundry-sdk", () => {
  return {
    default: vi.fn().mockImplementation((config) => ({
      config,
      messages: {
        create: vi.fn(),
      },
    })),
  };
});

describe("createAzureAnthropic", () => {
  const validOptions = {
    baseURL: "https://test.azure.com/anthropic",
    apiKey: "test-api-key",
  };

  describe("validation", () => {
    it("should throw AzureAnthropicError if baseURL is missing", () => {
      expect(() =>
        createAzureAnthropic({
          baseURL: "",
          apiKey: "test-key",
        })
      ).toThrow(AzureAnthropicError);
      expect(() =>
        createAzureAnthropic({
          baseURL: "",
          apiKey: "test-key",
        })
      ).toThrow("baseURL is required");
    });

    it("should throw AzureAnthropicError if apiKey is missing", () => {
      expect(() =>
        createAzureAnthropic({
          baseURL: "https://test.azure.com",
          apiKey: "",
        })
      ).toThrow(AzureAnthropicError);
      expect(() =>
        createAzureAnthropic({
          baseURL: "https://test.azure.com",
          apiKey: "",
        })
      ).toThrow("apiKey is required");
    });

    it("should create provider with valid options", () => {
      const provider = createAzureAnthropic(validOptions);

      expect(provider).toBeDefined();
      expect(typeof provider).toBe("function");
    });
  });

  describe("provider function", () => {
    it("should create model when called as function", () => {
      const provider = createAzureAnthropic(validOptions);

      const model = provider("claude-sonnet-4-5-20251001");

      expect(model).toBeInstanceOf(AzureAnthropicLanguageModel);
      expect(model.modelId).toBe("claude-sonnet-4-5-20251001");
    });

    it("should create model via languageModel method", () => {
      const provider = createAzureAnthropic(validOptions);

      const model = provider.languageModel("claude-opus-4-5-20251001");

      expect(model).toBeInstanceOf(AzureAnthropicLanguageModel);
      expect(model.modelId).toBe("claude-opus-4-5-20251001");
    });

    it("should pass model options to model instance", () => {
      const provider = createAzureAnthropic(validOptions);

      const model = provider("claude-sonnet-4-5-20251001", {
        maxOutputTokens: 8192,
      });

      expect(model).toBeInstanceOf(AzureAnthropicLanguageModel);
    });

    it("should accept custom model IDs", () => {
      const provider = createAzureAnthropic(validOptions);

      const model = provider("custom-deployment-name");

      expect(model.modelId).toBe("custom-deployment-name");
    });
  });

  describe("provider options", () => {
    it("should pass headers to client", () => {
      const provider = createAzureAnthropic({
        ...validOptions,
        headers: { "X-Custom-Header": "value" },
      });

      const model = provider("claude-sonnet-4-5-20251001");

      expect(model).toBeDefined();
    });
  });
});

describe("AzureAnthropicLanguageModel", () => {
  const validOptions = {
    baseURL: "https://test.azure.com/anthropic",
    apiKey: "test-api-key",
  };

  it("should have correct specificationVersion", () => {
    const provider = createAzureAnthropic(validOptions);
    const model = provider("claude-sonnet-4-5-20251001");

    expect(model.specificationVersion).toBe("v3");
  });

  it("should have correct provider name", () => {
    const provider = createAzureAnthropic(validOptions);
    const model = provider("claude-sonnet-4-5-20251001");

    expect(model.provider).toBe("azure-anthropic");
  });

  it("should have correct defaultObjectGenerationMode", () => {
    const provider = createAzureAnthropic(validOptions);
    const model = provider("claude-sonnet-4-5-20251001");

    expect(model.defaultObjectGenerationMode).toBe("tool");
  });

  it("should have empty supportedUrls", () => {
    const provider = createAzureAnthropic(validOptions);
    const model = provider("claude-sonnet-4-5-20251001");

    expect(model.supportedUrls).toEqual({});
  });
});
