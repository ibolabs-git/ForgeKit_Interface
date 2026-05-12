import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'
import type { AIProvider } from './interface'

export function createProvider(providerName: string, apiKey: string): AIProvider {
  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(apiKey)
    case 'openai':
      return new OpenAIProvider(apiKey)
    default:
      throw new Error(`Nepoznat provider: ${providerName}`)
  }
}

export const AVAILABLE_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic (Claude)' },
  { id: 'openai', name: 'OpenAI (GPT)' }
]
