import OpenAI from 'openai'
import type { AIProvider, Message, ModelInfo } from './interface'

// NVIDIA NIM — OpenAI-kompatibilan endpoint sa 80+ besplatnih modela
// Registracija i API ključ: https://build.nvidia.com
// Aktuelna lista modela: https://build.nvidia.com/explore/reasoning

export class NvidiaProvider implements AIProvider {
  readonly providerName = 'nvidia'
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1'
    })
  }

  async *sendMessage(messages: Message[], systemPrompt: string, model: string): AsyncGenerator<string> {
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
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }

  getAvailableModels(): ModelInfo[] {
    // Lista modela dostupnih na NVIDIA NIM (besplatni tier, ~40 req/min)
    // Za ažurnu listu i tačne model ID-eve: https://build.nvidia.com/explore
    return [
      // ── Nemotron (NVIDIA) ────────────────────────────────────────────────
      { id: 'nvidia/llama-3.3-nemotron-super-49b-v1',       name: 'Nemotron Super 49B ⭐' },
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct',        name: 'Nemotron 70B' },
      { id: 'nvidia/llama-3.1-nemotron-nano-8b-v1',          name: 'Nemotron Nano 8B (brz)' },
      // ── DeepSeek ─────────────────────────────────────────────────────────
      { id: 'deepseek-ai/deepseek-r1',                       name: 'DeepSeek R1 (reasoning)' },
      { id: 'deepseek-ai/deepseek-v3-0324',                  name: 'DeepSeek V3' },
      // ── Meta Llama ────────────────────────────────────────────────────────
      { id: 'meta/llama-3.3-70b-instruct',                   name: 'Llama 3.3 70B' },
      { id: 'meta/llama-3.1-405b-instruct',                  name: 'Llama 3.1 405B' },
      { id: 'meta/llama-3.1-8b-instruct',                    name: 'Llama 3.1 8B (brz)' },
      // ── Qwen / Alibaba ───────────────────────────────────────────────────
      { id: 'qwen/qwq-32b',                                  name: 'QwQ 32B (reasoning)' },
      { id: 'qwen/qwen2.5-72b-instruct',                     name: 'Qwen 2.5 72B' },
      { id: 'qwen/qwen2.5-coder-32b-instruct',               name: 'Qwen 2.5 Coder 32B' },
      // ── Mistral ──────────────────────────────────────────────────────────
      { id: 'mistralai/mistral-large-2-instruct',            name: 'Mistral Large 2' },
      { id: 'mistralai/mixtral-8x22b-instruct-v0.1',         name: 'Mixtral 8x22B' },
      // ── Microsoft ────────────────────────────────────────────────────────
      { id: 'microsoft/phi-4',                               name: 'Phi-4 (Microsoft)' },
      // ── Google ───────────────────────────────────────────────────────────
      { id: 'google/gemma-3-27b-it',                         name: 'Gemma 3 27B' },
      // ── Moonshot / Kimi ──────────────────────────────────────────────────
      { id: 'moonshotai/kimi-k1.5-32k-preview',             name: 'Kimi K1.5 (Moonshot)' },
      // ── MiniMax ──────────────────────────────────────────────────────────
      { id: 'minimax/minimax-text-01',                       name: 'MiniMax Text-01' },
      // ── THUDM / GLM ──────────────────────────────────────────────────────
      { id: 'thudm/glm-4-9b-chat',                           name: 'GLM-4 9B (THUDM)' }
    ]
  }
}
