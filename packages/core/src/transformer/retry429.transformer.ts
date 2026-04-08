import { LLMProvider, UnifiedChatRequest } from "../types/llm";
import { Transformer, TransformerContext, TransformerOptions } from "../types/transformer";

export class Retry429Transformer implements Transformer {
  static TransformerName = "retry429";

  private maxRetries: number;
  private initialDelayMs: number;
  private excludeStatusCodes: number[];

  constructor(private readonly options?: TransformerOptions) {
    this.maxRetries = options?.maxRetries ?? 3;
    this.initialDelayMs = options?.initialDelayMs ?? 1000;
    // excludeStatusCodes: comma-separated list of HTTP status codes that should NOT be retried.
    // All other status codes will be retried. Successful (2xx) responses are never retried.
    const rawExclude: string = options?.excludeStatusCodes ?? "";
    this.excludeStatusCodes = rawExclude
      .split(",")
      .map((s: string) => parseInt(s.trim(), 10))
      .filter((n: number) => !Number.isNaN(n));
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
          excludeStatusCodes: this.excludeStatusCodes,
        },
      },
    };
  }
}
