/**
 * End-to-end integration tests against the real Azure Anthropic API.
 *
 * Set AZURE_ANTHROPIC_API_KEY and AZURE_ANTHROPIC_BASE_URL (e.g. in .env) to run.
 * These tests are skipped when env vars are missing so CI without credentials still passes.
 */
import "dotenv/config";
import { describe, it, expect } from "vitest";
import { createAzureAnthropic } from "../../src/provider.js";
import { generateText, streamText } from "ai";

const baseURL = process.env.AZURE_ANTHROPIC_BASE_URL ?? "";
const apiKey = process.env.AZURE_ANTHROPIC_API_KEY ?? "";
const modelId = process.env.AZURE_ANTHROPIC_MODEL_ID ?? "claude-sonnet-4-5";

const hasE2EEnv = Boolean(baseURL && apiKey);

describe.skipIf(!hasE2EEnv)("e2e: Azure Anthropic provider integration", () => {
  const provider = createAzureAnthropic({
    baseURL,
    apiKey,
  });

  it(
    "generateText returns text from the API",
    async () => {
      const { text, finishReason, usage } = await generateText({
        model: provider(modelId),
        prompt: "Reply with exactly the word OK and nothing else.",
      });

      expect(text).toBeDefined();
      expect(typeof text).toBe("string");
      expect(text.trim().toUpperCase()).toBe("OK");
      expect(finishReason).toBeDefined();
      expect(usage).toBeDefined();
      expect(usage?.totalTokens).toBeGreaterThan(0);
    },
    { timeout: 30_000 }
  );

  it(
    "generateText handles a longer prompt and returns coherent text",
    async () => {
      const { text } = await generateText({
        model: provider(modelId),
        prompt: "In one short sentence, what is 2 + 2?",
      });

      expect(text).toBeDefined();
      expect(text.length).toBeGreaterThan(0);
      expect(text).toMatch(/\d|four|4/);
    },
    { timeout: 30_000 }
  );

  it(
    "streamText streams chunks from the API",
    async () => {
      const chunks: string[] = [];
      const { text } = await streamText({
        model: provider(modelId),
        prompt: "Say hello in one word.",
        onChunk: ({ chunk }) => {
          if (chunk.type === "text-delta") {
            // SDK passes internal part which uses .text (not .delta)
            const delta =
              "text" in chunk
                ? chunk.text
                : (chunk as { delta?: string }).delta;
            if (delta) chunks.push(delta);
          }
        },
      });

      const fullText = await text;
      expect(fullText).toBeDefined();
      expect(fullText.length).toBeGreaterThan(0);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join("").trim()).toBe(fullText.trim());
    },
    { timeout: 30_000 }
  );
});
