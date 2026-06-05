import type { InfoClient } from "@nktkas/hyperliquid";
import type { Market } from "../types.js";

export const MIN_OI_USD = 100_000;
export const MIN_VOL_USD = 500_000;

export class MarketsService {
  constructor(private readonly client: InfoClient) {}

  async getActiveMarkets(): Promise<Market[]> {
    const [meta, ctxs] = await this.client.metaAndAssetCtxs();

    return meta.universe
      .map((m, i) => {
        const ctx = ctxs[i];
        return {
          coin: m.name,
          openInterest: parseFloat(ctx.openInterest),
          dayNtlVlm: parseFloat(ctx.dayNtlVlm),
          markPx: parseFloat(ctx.markPx),
          funding: parseFloat(ctx.funding),
        };
      })
      .filter((m) => m.openInterest >= MIN_OI_USD && m.dayNtlVlm >= MIN_VOL_USD);
  }
}
