import type { InfoClient } from "@nktkas/hyperliquid";
import type { BidAskSpread } from "../types.js";

export class OrderbookService {
  constructor(private readonly client: InfoClient) {}

  async getSpread(coin: string): Promise<BidAskSpread | null> {
    const book = await this.client.l2Book({ coin });
    if (!book) return null;

    const [bids, asks] = book.levels;
    if (bids.length === 0 || asks.length === 0) return null;

    const bid = parseFloat(bids[0].px);
    const ask = parseFloat(asks[0].px);
    const mid = (bid + ask) / 2;
    const spreadPct = ((ask - bid) / mid) * 100;

    return { coin, bid, ask, mid, spreadPct };
  }
}
