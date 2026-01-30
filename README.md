# anthropic-azure-provider

Use Claude models on Azure AI Foundry with the Vercel AI SDK.

## Install

```bash
npm install @karimdaw/anthropic-azure-provider @ai-sdk/provider
```

## Quick Start

```typescript
import { createAzureAnthropic } from '@karimdaw/anthropic-azure-provider';
import { generateText } from 'ai';

const provider = createAzureAnthropic({
  baseURL: process.env.AZURE_ANTHROPIC_BASE_URL,
  apiKey: process.env.AZURE_ANTHROPIC_API_KEY,
});

const { text } = await generateText({
  model: provider('claude-sonnet-4-5-20251001'),
  prompt: 'Hello!',
});
```

## Options

**Provider:**
- `baseURL` (required) - Your Azure Foundry endpoint
- `apiKey` (required) - API key from Azure Portal
- `headers` (optional) - Custom headers

**Model:**
- `maxOutputTokens` (default: 4096) - Max tokens to generate

## Examples

**Streaming:**

```typescript
const { textStream } = streamText({
  model: provider('claude-sonnet-4-5-20251001'),
  prompt: 'Tell me a story',
});

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

**Tool Calling:**

```typescript
const { text, toolCalls } = await generateText({
  model: provider('claude-sonnet-4-5-20251001'),
  prompt: 'What is the weather in Tokyo?',
  tools: {
    getWeather: tool({
      description: 'Get weather for a location',
      parameters: z.object({ location: z.string() }),
      execute: async ({ location }) => ({ temp: 22, condition: 'sunny' }),
    }),
  },
});
```

**Custom Max Tokens:**

```typescript
const model = provider('claude-sonnet-4-5-20251001', {
  maxOutputTokens: 8192,
});
```

## Supported Models

All Claude models on Azure Foundry work. Common ones:

- `claude-sonnet-4-5-20251001`
- `claude-opus-4-5-20251001`
- `claude-haiku-4-5-20251001`
- `claude-3-5-sonnet-20241022`

Custom model IDs work too.

## Error Handling

```typescript
import { AzureAnthropicError } from '@karimdaw/anthropic-azure-provider';

try {
  // ... your code
} catch (error) {
  if (error instanceof AzureAnthropicError) {
    console.error(`${error.code}: ${error.message}`);
  }
}
```

Error codes: `"validation"` (config issues) or `"conversion"` (data issues).

## Environment Variables

```bash
AZURE_ANTHROPIC_BASE_URL=https://your-resource.services.ai.azure.com/anthropic
AZURE_ANTHROPIC_API_KEY=your-api-key
AZURE_ANTHROPIC_MODEL_ID=claude-sonnet-4-5-20251001
```

## License

MIT
