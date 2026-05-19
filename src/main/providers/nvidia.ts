import OpenAI from 'openai'
import type { AIProvider, Message, ModelInfo } from './interface'

// NVIDIA NIM — OpenAI-kompatibilan endpoint sa 80+ besplatnih modela
// Registracija i API ključ: https://build.nvidia.com
// Aktuelna lista modela: https://build.nvidia.com/explore/reasoning

export class NvidiaProvider implements AIProvider {
  readonly providerName = 'nvidia'
  private client: OpenAI

  constructor(apiKey: string, baseURL = 'https://integrate.api.nvidia.com/v1') {
    this.client = new OpenAI({ apiKey, baseURL })
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
    // ForgeKit NIM pool — 5 modela, svaki pokriva jednu dimenziju
    // Ažurna lista: https://build.nvidia.com/explore
    return [
      // Orchestrator — role discipline, ForgeKit tok, instruction-following
      { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',     name: 'Nemotron Super 49B v1.5  [Orchestrator]' },

      // Thinker / General — reasoning, structured output, baseline
      { id: 'openai/gpt-oss-120b',                          name: 'GPT-OSS 120B  [Thinker / reasoning]' },

      // Thinker heavy — premortem, metakognicija, složena analiza
      { id: 'deepseek-ai/deepseek-v4-pro',                  name: 'DeepSeek V4 Pro  [Thinker / analiza]' },

      // Builder — kod, refaktor, instrukcije, implementacija
      { id: 'qwen/qwen3-coder-480b-a35b-instruct',          name: 'Qwen3 Coder 480B  [Builder / kod]' },

      // Fallback / nano — brzina, cost, svakodnevni kraći taskovi
      { id: 'nvidia/nemotron-3-nano-30b-a3b',               name: 'Nemotron Nano 30B  [fallback / brz]' }
    ]
  }
}
