import type { ForgeKitRole } from '../types'

export interface ModelRecommendation {
  provider: 'nvidia'
  model: string
  label: string
  reason: string
}

const NVIDIA_MODEL_RECOMMENDATIONS: Record<ForgeKitRole, ModelRecommendation | null> = {
  ORCHESTRATOR: {
    provider: 'nvidia',
    model: 'nvidia/nemotron-3-super-120b-a12b',
    label: 'Nemotron 3 Super 120B',
    reason: 'najbolji za koordinaciju, role discipline i multi-layer tok'
  },
  THINKER: {
    provider: 'nvidia',
    model: 'deepseek-ai/deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    reason: 'najbolji za dublju analizu, arhitekturu i problem solving'
  },
  BUILDER: {
    provider: 'nvidia',
    model: 'qwen/qwen3-coder-480b-a35b-instruct',
    label: 'Qwen3 Coder 480B',
    reason: 'najbolji za kod, refaktor i patch reasoning'
  },
  REVIEWER: {
    provider: 'nvidia',
    model: 'openai/gpt-oss-120b',
    label: 'GPT-OSS 120B',
    reason: 'dobar za review, objasnjenje i transparentno reasoning proveravanje'
  },
  OBSERVER: {
    provider: 'nvidia',
    model: 'nvidia/nemotron-3-super-120b-a12b',
    label: 'Nemotron 3 Super 120B',
    reason: 'dobar za procesni pregled, boundary signale i koordinacioni kontekst'
  },
  RESEARCH: {
    provider: 'nvidia',
    model: 'mistralai/mistral-large-3-675b-instruct-2512',
    label: 'Mistral Large 3',
    reason: 'najbolji za research, business kontekst, sazimanje izvora i decision-support packet'
  },
  PREMORTEM: {
    provider: 'nvidia',
    model: 'qwen/qwen3-next-80b-a3b-thinking',
    label: 'Qwen3 Next Thinking',
    reason: 'dobar za rizike, failure scenario i proveru pre bitnih odluka'
  },
  'MEMORY CURATOR': {
    provider: 'nvidia',
    model: 'mistralai/mistral-large-3-675b-instruct-2512',
    label: 'Mistral Large 3',
    reason: 'dobar za duzi kontekst, research i sazimanje stabilnih nalaza'
  },
  USER: null,
  SYSTEM: null
}

export function getModelRecommendation(role: ForgeKitRole): ModelRecommendation | null {
  return NVIDIA_MODEL_RECOMMENDATIONS[role] ?? null
}
