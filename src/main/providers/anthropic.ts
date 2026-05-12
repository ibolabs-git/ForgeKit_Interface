import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, Message, ModelInfo } from './interface'

export class AnthropicProvider implements AIProvider {
  readonly providerName = 'anthropic'
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async *sendMessage(messages: Message[], systemPrompt: string, model: string): AsyncGenerator<string> {
    const stream = this.client.messages.stream({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      }))
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text
      }
    }
  }

  getAvailableModels(): ModelInfo[] {
    return [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' }
    ]
  }
}
