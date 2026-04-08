import { ProxyAgent } from "undici";
import { UnifiedChatRequest } from "../types/llm";

export async function sendUnifiedRequest(
  url: URL | string,
  request: UnifiedChatRequest,
  config: any,
  context: any,
  logger?: any
): Promise<Response> {
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  if (config.headers) {
    Object.entries(config.headers).forEach(([key, value]) => {
      if (value) {
        headers.set(key, value as string);
      }
    });
  }
  let combinedSignal: AbortSignal;
  const timeoutSignal = AbortSignal.timeout(config.TIMEOUT ?? 60 * 1000 * 60);

  if (config.signal) {
    const controller = new AbortController();
    const abortHandler = () => controller.abort();
    config.signal.addEventListener("abort", abortHandler);
    timeoutSignal.addEventListener("abort", abortHandler);
    combinedSignal = controller.signal;
  } else {
    combinedSignal = timeoutSignal;
  }

  const fetchOptions: RequestInit = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(request),
    signal: combinedSignal,
  };

  if (config.httpsProxy) {
    (fetchOptions as any).dispatcher = new ProxyAgent(
      new URL(config.httpsProxy).toString()
    );
  }
  const requestUrl = typeof url === "string" ? url : url.toString();
  logger?.debug(
    {
      reqId: context.req.id,
      request: fetchOptions,
      headers: Object.fromEntries(headers.entries()),
      requestUrl,
      useProxy: config.httpsProxy,
    },
    "final request"
  );

  const retry429 = config.retry429;
  const maxRetries: number = retry429?.maxRetries ?? 0;
  const initialDelayMs: number = retry429?.initialDelayMs ?? 1000;
  // Status codes that should NOT be retried; all other codes trigger a retry
  const excludeStatusCodes: number[] = retry429?.excludeStatusCodes ?? [200];

  let attempt = 0;
  while (true) {
    const response = await fetch(requestUrl, fetchOptions);
    const shouldRetry =
      !excludeStatusCodes.includes(response.status) && attempt < maxRetries;
    if (!shouldRetry) {
      return response;
    }

    const retryAfterHeader = response.headers.get("Retry-After");
    let delayMs: number;
    if (retryAfterHeader && /^\d+$/.test(retryAfterHeader)) {
      delayMs = parseInt(retryAfterHeader, 10) * 1000;
    } else if (retryAfterHeader) {
      const parsedDate = new Date(retryAfterHeader);
      const parsedMs = Number.isNaN(parsedDate.getTime())
        ? -1
        : parsedDate.getTime() - Date.now();
      delayMs = parsedMs > 0 ? parsedMs : initialDelayMs;
    } else {
      delayMs = Math.random() * initialDelayMs;
    }

    logger?.warn(
      {
        reqId: context.req.id,
        attempt: attempt + 1,
        maxRetries,
        delayMs,
        status: response.status,
      },
      "[retry429] request failed, retrying after delay"
    );
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    attempt++;
  }
}
