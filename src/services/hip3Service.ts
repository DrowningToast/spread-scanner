import type { InfoClient } from "@nktkas/hyperliquid";
import { getCanonicalName } from "../config/aliases.js";
import type { Hip3AssetGroup, Hip3MarketSpread } from "../types.js";

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Hip3Service {
  constructor(private readonly client: InfoClient) {}

  async getDexes(): Promise<string[]> {
    const dexes = await this.client.perpDexs();
    return dexes.filter((d): d is NonNullable<typeof d> => d !== null && !!d.name).map((d) => d.name);
  }

  async getHip3Spreads(dexes: string[]): Promise<Hip3AssetGroup[]> {
    const allMarkets: Hip3MarketSpread[] = [];

    for (const dex of dexes) {
      const [meta, ctxs] = await this.client.metaAndAssetCtxs({ dex });
      const tickers = meta.universe.map((u) => u.name.includes(":") ? u.name.split(":")[1] : u.name);

      for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
        const batch = tickers.slice(i, i + BATCH_SIZE);
        const books = await Promise.all(batch.map((ticker) => this.client.l2Book({ coin: `${dex}:${ticker}` })));

        for (let j = 0; j < batch.length; j++) {
          const ticker = batch[j];
          const book = books[j];
          if (!book) continue;

          const [bids, asks] = book.levels;
          if (bids.length === 0 || asks.length === 0) continue;

          const bid = parseFloat(bids[0].px);
          const ask = parseFloat(asks[0].px);
          const mid = (bid + ask) / 2;
          const spreadPct = ((ask - bid) / mid) * 100;
          const dayNtlVlm = parseFloat((ctxs[i + j] as any)?.dayNtlVlm ?? "0");

          allMarkets.push({ dex, ticker, canonical: getCanonicalName(ticker), bid, ask, mid, spreadPct, dayNtlVlm });
        }

        if (i + BATCH_SIZE < tickers.length) await sleep(BATCH_DELAY_MS);
      }
    }

    // Group by canonical name
    const groupMap = new Map<string, Hip3MarketSpread[]>();
    for (const market of allMarkets) {
      const existing = groupMap.get(market.canonical) ?? [];
      existing.push(market);
      groupMap.set(market.canonical, existing);
    }

    return [...groupMap.entries()]
      .map(([canonical, markets]) => ({ canonical, markets }))
      .sort((a, b) => Math.max(...b.markets.map((m) => m.spreadPct)) - Math.max(...a.markets.map((m) => m.spreadPct)));
  }
}
