# anthropic-azure-provider

Azure Anthropic provider for Vercel AI SDK v5.

Use Anthropic Claude models deployed on Azure AI Foundry with the Vercel AI SDK.

## Installation

```bash
npm install anthropic-azure-provider @ai-sdk/provider
```

## Quick Start

```typescript
import { createAzureAnthropic } from 'anthropic-azure-provider';
import { generateText } from 'ai';

const provider = createAzureAnthropic({
  baseURL: process.env.AZURE_ANTHROPIC_BASE_URL,
  apiKey: process.env.AZURE_ANTHROPIC_API_KEY,
});

const { text } = await generateText({
  model: provider('claude-sonnet-4-5-20251001'),
  prompt: 'Explain quantum computing in simple terms.',
});

console.log(text);
```

## Configuration

### Provider Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `baseURL` | `string` | Yes | Azure Anthropic Foundry endpoint URL |
| `apiKey` | `string` | Yes | API key from Azure Portal |
| `headers` | `Record<string, string>` | No | Custom headers for all requests |

### Model Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxOutputTokens` | `number` | `4096` | Maximum tokens to generate |

## Usage Examples

### Basic Text Generation

```typescript
import { createAzureAnthropic } from 'anthropic-azure-provider';
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

### Streaming

```typescript
import { createAzureAnthropic } from 'anthropic-azure-provider';
import { streamText } from 'ai';

const provider = createAzureAnthropic({
  baseURL: process.env.AZURE_ANTHROPIC_BASE_URL,
  apiKey: process.env.AZURE_ANTHROPIC_API_KEY,
});

const { textStream } = streamText({
  model: provider('claude-sonnet-4-5-20251001'),
  prompt: 'Write a short story about a robot.',
});

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

### Tool Calling

```typescript
import { createAzureAnthropic } from 'anthropic-azure-provider';
import { generateText, tool } from 'ai';
import { z } from 'zod';

const provider = createAzureAnthropic({
  baseURL: process.env.AZURE_ANTHROPIC_BASE_URL,
  apiKey: process.env.AZURE_ANTHROPIC_API_KEY,
});

const { text, toolCalls } = await generateText({
  model: provider('claude-sonnet-4-5-20251001'),
  prompt: 'What is the weather in Tokyo?',
  tools: {
    getWeather: tool({
      description: 'Get current weather for a location',
      parameters: z.object({
        location: z.string().describe('City name'),
      }),
      execute: async ({ location }) => {
        return { temperature: 22, condition: 'sunny' };
      },
    }),
  },
});
```

### Custom Max Tokens

```typescript
const model = provider('claude-sonnet-4-5-20251001', {
  maxOutputTokens: 8192,
});

const { text } = await generateText({
  model,
  prompt: 'Write a detailed essay.',
});
```

## Supported Models

The provider supports all Claude models available on Azure AI Foundry:

- `claude-opus-4-5-20251001`
- `claude-sonnet-4-5-20251001`
- `claude-haiku-4-5-20251001`
- `claude-opus-4-1-20251001`
- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

Custom model IDs are also supported for custom deployments.

## Error Handling

The provider includes custom error classes:

```typescript
import {
  AzureAnthropicError,
  AzureAnthropicAPIError,
  AzureAnthropicAuthError,
  ConversionError,
} from 'anthropic-azure-provider';

try {
  const { text } = await generateText({
    model: provider('claude-sonnet-4-5-20251001'),
    prompt: 'Hello!',
  });
} catch (error) {
  if (error instanceof AzureAnthropicAPIError) {
    console.error(`API Error: ${error.statusCode} - ${error.message}`);
    if (error.isRetryable) {
      // Retry the request
    }
  }
}
```

## Environment Variables

```bash
AZURE_ANTHROPIC_BASE_URL=https://your-resource.services.ai.azure.com/anthropic
AZURE_ANTHROPIC_API_KEY=your-api-key
```

## License

MIT
