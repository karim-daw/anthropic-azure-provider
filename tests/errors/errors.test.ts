import { describe, it, expect } from "vitest";
import { AzureAnthropicError } from "../../src/errors.js";

describe("AzureAnthropicError", () => {
  it("should create error with message", () => {
    const error = new AzureAnthropicError("validation", "Test error");

    expect(error.message).toBe("Test error");
    expect(error.name).toBe("AzureAnthropicError");
    expect(error.provider).toBe("azure-anthropic");
    expect(error.code).toBe("validation");
  });

  it("should create validation error", () => {
    const error = new AzureAnthropicError("validation", "baseURL is required");

    expect(error.code).toBe("validation");
    expect(error.field).toBeUndefined();
  });

  it("should create conversion error with field", () => {
    const error = new AzureAnthropicError(
      "conversion",
      "Invalid format",
      "mediaType"
    );

    expect(error.code).toBe("conversion");
    expect(error.field).toBe("mediaType");
  });

  it("should create conversion error without field", () => {
    const error = new AzureAnthropicError("conversion", "Invalid format");

    expect(error.code).toBe("conversion");
    expect(error.field).toBeUndefined();
  });

  it("should be instanceof Error", () => {
    const error = new AzureAnthropicError("validation", "Test");

    expect(error instanceof Error).toBe(true);
    expect(error instanceof AzureAnthropicError).toBe(true);
  });
});
