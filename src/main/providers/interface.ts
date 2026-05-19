export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ModelInfo {
  id: string
  name: string
}

export interface AIProvider {
  readonly providerName: string
  sendMessage(
    messages: Message[],
    systemPrompt: string,
    model: string,
    options?: { signal?: AbortSignal }
  ): AsyncGenerator<string>
  getAvailableModels(): ModelInfo[]
}
