/**
 * Shared model pricing table (USD per 1M tokens).
 * Used by agent routes and usage cost pages.
 */

export const PRICE_PER_MILLION: Record<
  string,
  { input: number; output: number }
> = {
  default: { input: 3, output: 15 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4-0": { input: 3, output: 15 },
  "claude-3-5-sonnet": { input: 3, output: 15 },
  "claude-3-5-haiku": { input: 0.8, output: 4 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
  "claude-3-opus": { input: 15, output: 75 },
  "gpt-5": { input: 10, output: 40 },
  "gpt-4.5": { input: 75, output: 150 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-4": { input: 30, output: 60 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  o3: { input: 10, output: 40 },
  "o4-mini": { input: 1.1, output: 4.4 },
};

export function priceForModel(
  model: string | null | undefined,
): { input: number; output: number } {
  const key = String(model ?? "").toLowerCase();
  for (const k of Object.keys(PRICE_PER_MILLION)) {
    if (k !== "default" && key.includes(k)) return PRICE_PER_MILLION[k];
  }
  return PRICE_PER_MILLION.default;
}

export function computeCostUSD(
  model: string | null | undefined,
  inputTokens: number,
  outputTokens: number,
): number {
  const prices = priceForModel(model);
  return (
    (inputTokens / 1_000_000) * prices.input +
    (outputTokens / 1_000_000) * prices.output
  );
}
