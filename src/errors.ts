/**
 * Base error class for Azure Anthropic provider errors.
 */
export class AzureAnthropicError extends Error {
  public readonly provider = "azure-anthropic";
  public readonly code: "validation" | "conversion";
  public readonly field: string | undefined;

  constructor(
    code: "validation" | "conversion",
    message: string,
    field?: string
  ) {
    super(message);
    this.name = "AzureAnthropicError";
    this.code = code;
    this.field = field;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
