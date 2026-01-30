import "dotenv/config";
import { createAzureAnthropic } from "@karimdaw/anthropic-azure-provider";
import { generateText, streamText } from "ai";

const baseURL = process.env.AZURE_ANTHROPIC_BASE_URL || "";
const apiKey = process.env.AZURE_ANTHROPIC_API_KEY || "";
const modelId =
  process.env.AZURE_ANTHROPIC_MODEL_ID || "claude-sonnet-4-5-20251001";
if (!apiKey || !baseURL || !modelId) {
  throw new Error(
    "AZURE_ANTHROPIC_BASE_URL and AZURE_ANTHROPIC_API_KEY and AZURE_ANTHROPIC_MODEL_ID are required"
  );
}

const provider = createAzureAnthropic({
  baseURL: baseURL as string,
  apiKey: apiKey as string,
});

async function main() {
  console.log(`[PROVIDER] Using model: ${modelId}`);
  console.log(`[PROVIDER] Using baseURL: ${baseURL}`);
  console.log("[PROVIDER] starting generateText");
  const { text } = await generateText({
    model: provider(modelId),
    prompt: "Explain quantum computing in simple terms.",
  });
  console.log("[PROVIDER] Generated text: \n", text);
  console.log("[PROVIDER] finished generateText");

  console.log("[PROVIDER] starting streamText");
  const textStream = streamText({
    model: provider(modelId),
    prompt: "Explain quantum computing in simple terms.",
  });
  for await (const chunk of textStream.textStream) {
    process.stdout.write(chunk);
  }
  console.log("\n[PROVIDER] finished streamText\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
