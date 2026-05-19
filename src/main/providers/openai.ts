import OpenAI from 'openai'
import type { AIProvider, Message, ModelInfo } from './interface'

export class OpenAIProvider implements AIProvider {
  readonly providerName = 'openai'
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async *sendMessage(
    messages: Message[],
    systemPrompt: string,
    model: string,
    options?: { signal?: AbortSignal }
  ): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      ]
    }, { signal: options?.signal })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }

  getAvailableModels(): ModelInfo[] {
    return [
      { id: 'gpt-5.5',      name: 'GPT-5.5' },
      { id: 'gpt-5.4',      name: 'GPT-5.4' },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
      { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano' },
      { id: 'gpt-4o',       name: 'GPT-4o' },
      { id: 'gpt-4o-mini',  name: 'GPT-4o Mini' }
    ]
  }
}
