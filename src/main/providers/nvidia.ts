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
    // ForgeKit NIM pool - 10 modela za sire testiranje kroz role/tokove.
    // Azurna lista: https://build.nvidia.com/explore i https://docs.api.nvidia.com/nim/reference/llm-apis
    // Labeli su operativna preporuka za izbor modela; runtime routing ostaje u Orchestrator/MASTER-COORD toku.
    return [
      // Orchestrator / MASTER-COORD - agentic tok, koordinacija, multi-layer odluke
      { id: 'nvidia/nemotron-3-super-120b-a12b',            name: 'Nemotron 3 Super 120B  [Orchestrator / agentic]' },

      // Strategy / Spec - long-horizon planiranje, tool-use, slozeni tokovi
      { id: 'z-ai/glm-5.1',                                  name: 'GLM 5.1  [Strategy / agentic]' },

      // Builder - kod, refaktor, implementacija, patch reasoning
      { id: 'qwen/qwen3-coder-480b-a35b-instruct',          name: 'Qwen3 Coder 480B  [Builder / kod]' },

      // Thinker - dublja analiza, arhitektura, problem solving
      { id: 'deepseek-ai/deepseek-v4-pro',                  name: 'DeepSeek V4 Pro  [Thinker / analiza]' },

      // Reviewer - reasoning, objasnjenje, review i transparentna provera
      { id: 'openai/gpt-oss-120b',                          name: 'GPT-OSS 120B  [Reviewer / reasoning]' },

      // Premortem - rizik, kontradikcije, edge-case analiza
      { id: 'qwen/qwen3-next-80b-a3b-thinking',             name: 'Qwen3 Next Thinking  [Premortem / rizik]' },

      // Research - business/product, long-context enterprise tokovi
      { id: 'mistralai/mistral-large-3-675b-instruct-2512', name: 'Mistral Large 3  [Research / business]' },

      // Routine / fast pass - kraci zadaci, brzi proverni odgovori
      { id: 'deepseek-ai/deepseek-v4-flash',                name: 'DeepSeek V4 Flash  [brz / rutina]' },

      // Balanced fallback - postojeci stabilni Orchestrator kandidat
      { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',     name: 'Nemotron Super 49B v1.5  [balanced / fallback]' },

      // Nano fallback - brzina, cost, svakodnevni kraci taskovi
      { id: 'nvidia/nemotron-3-nano-30b-a3b',               name: 'Nemotron Nano 30B  [fallback / brz]' }
    ]
  }
}
