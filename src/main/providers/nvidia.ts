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
    // Lista verifikovana sa live NVIDIA NIM API-ja (integrate.api.nvidia.com/v1/models)
    // Ažurna lista i detalji: https://build.nvidia.com/explore
    return [
      // ── NVIDIA Nemotron ───────────────────────────────────────────────────
      { id: 'nvidia/llama-3.3-nemotron-super-49b-v1',        name: 'Nemotron Super 49B ⭐' },
      { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',       name: 'Nemotron Ultra 253B' },
      { id: 'nvidia/llama-3.1-nemotron-nano-8b-v1',          name: 'Nemotron Nano 8B (brz)' },
      // ── OpenAI OSS (besplatno na NIM!) ────────────────────────────────────
      { id: 'openai/gpt-oss-120b',                           name: 'GPT-OSS 120B ⭐' },
      { id: 'openai/gpt-oss-20b',                            name: 'GPT-OSS 20B (brz)' },
      // ── DeepSeek ──────────────────────────────────────────────────────────
      { id: 'deepseek-ai/deepseek-v4-pro',                   name: 'DeepSeek V4 Pro ⭐' },
      { id: 'deepseek-ai/deepseek-v4-flash',                 name: 'DeepSeek V4 Flash (brz)' },
      // ── Moonshot / Kimi ───────────────────────────────────────────────────
      { id: 'moonshotai/kimi-k2.6',                          name: 'Kimi K2.6 (Moonshot)' },
      { id: 'moonshotai/kimi-k2-instruct',                   name: 'Kimi K2 Instruct' },
      // ── MiniMax ───────────────────────────────────────────────────────────
      { id: 'minimaxai/minimax-m2.7',                        name: 'MiniMax M2.7' },
      // ── Meta Llama ────────────────────────────────────────────────────────
      { id: 'meta/llama-4-maverick-17b-128e-instruct',       name: 'Llama 4 Maverick 17B' },
      { id: 'meta/llama-3.3-70b-instruct',                   name: 'Llama 3.3 70B' },
      { id: 'meta/llama-3.1-8b-instruct',                    name: 'Llama 3.1 8B (brz)' },
      // ── Qwen / Alibaba ────────────────────────────────────────────────────
      { id: 'qwen/qwen3-coder-480b-a35b-instruct',           name: 'Qwen3 Coder 480B 🔧' },
      { id: 'qwen/qwen3.5-397b-a17b',                        name: 'Qwen 3.5 397B' },
      { id: 'qwen/qwen3.5-122b-a10b',                        name: 'Qwen 3.5 122B' },
      { id: 'qwen/qwq-32b',                                  name: 'QwQ 32B (reasoning)' },
      // ── Mistral ───────────────────────────────────────────────────────────
      { id: 'mistralai/mistral-large-3-675b-instruct-2512',  name: 'Mistral Large 3 (675B)' },
      { id: 'mistralai/mistral-medium-3.5-128b',             name: 'Mistral Medium 3.5 128B' },
      { id: 'mistralai/magistral-small-2506',                name: 'Magistral Small' },
      { id: 'mistralai/mixtral-8x22b-instruct-v0.1',         name: 'Mixtral 8x22B' },
      // ── Google ────────────────────────────────────────────────────────────
      { id: 'google/gemma-4-31b-it',                         name: 'Gemma 4 31B (Google)' },
      // ── Microsoft ─────────────────────────────────────────────────────────
      { id: 'microsoft/phi-4-mini-instruct',                 name: 'Phi-4 Mini (brz)' },
      // ── ByteDance ─────────────────────────────────────────────────────────
      { id: 'bytedance/seed-oss-36b-instruct',               name: 'Seed OSS 36B (ByteDance)' }
    ]
  }
}
