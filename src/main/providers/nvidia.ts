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
    // Verifikovano sa live NVIDIA NIM API-ja — https://build.nvidia.com/explore
    return [

      // ════════════════════════════════════════════════════════════════════
      // FORGEKIT TEST FAVORITI — top 5 odabrana za ForgeKit rad i testiranje
      // ════════════════════════════════════════════════════════════════════

      // 1. Dnevni rad — Pilar/Orchestrator/brzi taskovi
      { id: 'nvidia/nemotron-3-nano-30b-a3b',               name: '★ Nemotron Nano 30B  [dnevni rad]' },

      // 2. Teški režim — Creue, premortem, strateške odluke, veliki kontekst
      { id: 'nvidia/nemotron-3-super-120b-a12b',            name: '★ Nemotron Super 120B  [teški režim]' },

      // 3. Reasoning baseline — format/output test, Apache 2.0
      { id: 'openai/gpt-oss-120b',                          name: '★ GPT-OSS 120B  [reasoning baseline]' },

      // 4. Agentic benchmark — role discipline, long-horizon planning, tool use
      { id: 'z-ai/glm-5.1',                                 name: '★ GLM 5.1  [agentic benchmark]' },

      // 5. Dugi kontekst — handoff, složeni projekti, multimodal agentic
      { id: 'moonshotai/kimi-k2.6',                         name: '★ Kimi K2.6  [dugi kontekst]' },

      // ════════════════════════════════════════════════════════════════════
      // REZERVE — odlični modeli za specifične scenarije
      // ════════════════════════════════════════════════════════════════════

      // Coding
      { id: 'qwen/qwen3-coder-480b-a35b-instruct',          name: 'Qwen3 Coder 480B [coding]' },
      { id: 'deepseek-ai/deepseek-v4-pro',                  name: 'DeepSeek V4 Pro' },
      { id: 'deepseek-ai/deepseek-v4-flash',                name: 'DeepSeek V4 Flash [brz]' },
      { id: 'qwen/qwq-32b',                                 name: 'QwQ 32B [reasoning]' },
      { id: 'qwen/qwen3.5-122b-a10b',                       name: 'Qwen 3.5 122B' },
      { id: 'moonshotai/kimi-k2-instruct',                  name: 'Kimi K2 Instruct' },

      // Veliki modeli
      { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',      name: 'Nemotron Ultra 253B' },
      { id: 'mistralai/mistral-large-3-675b-instruct-2512', name: 'Mistral Large 3 (675B)' },
      { id: 'qwen/qwen3.5-397b-a17b',                       name: 'Qwen 3.5 397B' },

      // Brzi / lagani
      { id: 'nvidia/llama-3.1-nemotron-nano-8b-v1',         name: 'Nemotron Nano 8B [brz]' },
      { id: 'openai/gpt-oss-20b',                           name: 'GPT-OSS 20B [brz]' },
      { id: 'meta/llama-4-maverick-17b-128e-instruct',      name: 'Llama 4 Maverick 17B' },
      { id: 'meta/llama-3.3-70b-instruct',                  name: 'Llama 3.3 70B' },
      { id: 'meta/llama-3.1-8b-instruct',                   name: 'Llama 3.1 8B [brz]' },
      { id: 'microsoft/phi-4-mini-instruct',                name: 'Phi-4 Mini [brz]' },
      { id: 'minimaxai/minimax-m2.7',                       name: 'MiniMax M2.7' },
      { id: 'google/gemma-4-31b-it',                        name: 'Gemma 4 31B' },
      { id: 'mistralai/mistral-medium-3.5-128b',            name: 'Mistral Medium 3.5 128B' },
      { id: 'bytedance/seed-oss-36b-instruct',              name: 'Seed OSS 36B (ByteDance)' }
    ]
  }
}
