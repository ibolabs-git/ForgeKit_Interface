import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'
import { NvidiaProvider } from './nvidia'
import type { AIProvider } from './interface'

export function createProvider(
  providerName: string,
  apiKey: string,
  options?: { baseURL?: string }
): AIProvider {
  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(apiKey)
    case 'openai':
      return new OpenAIProvider(apiKey)
    case 'nvidia':
      return new NvidiaProvider(apiKey, options?.baseURL)
    default:
      throw new Error(`Nepoznat provider: ${providerName}`)
  }
}

export const AVAILABLE_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic (Claude)' },
  { id: 'openai',    name: 'OpenAI (GPT)' },
  { id: 'nvidia',    name: 'NVIDIA NIM (besplatno)' }
]
