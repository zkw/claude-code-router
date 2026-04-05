import { LLMProvider, UnifiedChatRequest } from "../types/llm";
import { Transformer, TransformerContext, TransformerOptions } from "../types/transformer";

export class Retry429Transformer implements Transformer {
  static TransformerName = "retry429";

  private maxRetries: number;
  private initialDelayMs: number;

  constructor(private readonly options?: TransformerOptions) {
    this.maxRetries = options?.maxRetries ?? 3;
    this.initialDelayMs = options?.initialDelayMs ?? 1000;
  }

  async transformRequestIn(
    request: UnifiedChatRequest,
    _provider: LLMProvider,
    _context: TransformerContext
  ): Promise<{ body: UnifiedChatRequest; config: any }> {
    return {
      body: request,
      config: {
        retry429: {
          maxRetries: this.maxRetries,
          initialDelayMs: this.initialDelayMs,
        },
      },
    };
  }
}
