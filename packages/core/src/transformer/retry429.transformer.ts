import { LLMProvider, UnifiedChatRequest } from "../types/llm";
import { Transformer, TransformerContext, TransformerOptions } from "../types/transformer";

export class Retry429Transformer implements Transformer {
  static TransformerName = "retry429";

  private maxRetries: number;
  private initialDelayMs: number;
  private excludeStatusCodes: number[];

  constructor(private readonly options?: TransformerOptions) {
    this.maxRetries = Number.isNaN(Number(options?.maxRetries))
      ? 3
      : Number(options?.maxRetries);
    this.initialDelayMs = Number.isNaN(Number(options?.initialDelayMs))
      ? 1000
      : Number(options?.initialDelayMs);
    // excludeStatusCodes may be a comma-separated string or an array of numbers.
    const rawExclude = options?.excludeStatusCodes ?? "";
    const excludeList = Array.isArray(rawExclude)
      ? rawExclude
      : String(rawExclude).split(",");
    this.excludeStatusCodes = excludeList
      .map((item: string | number) => parseInt(String(item).trim(), 10))
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
