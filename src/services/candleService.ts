import type { InfoClient } from "@nktkas/hyperliquid";
import type { CandleInterval, CandleRangeStats } from "../types.js";

export const CONSISTENCY_RANGE_THRESHOLD_PCT = 0.5;

export class CandleService {
  constructor(private readonly client: InfoClient) {}

  async getRangeStats(coin: string, interval: CandleInterval, windowMs: number): Promise<CandleRangeStats> {
    const startTime = Date.now() - windowMs;
    const candles = await this.client.candleSnapshot({ coin, interval, startTime });

    if (candles.length === 0) {
      return { coin, interval, sampleCount: 0, meanRangePct: 0, consistencyScore: 0, totalVolume: 0 };
    }

    const ranges = candles.map((c) => {
      const high = parseFloat(c.h);
      const low = parseFloat(c.l);
      const close = parseFloat(c.c);
      return close > 0 ? ((high - low) / close) * 100 : 0;
    });

    const meanRangePct = ranges.reduce((sum, r) => sum + r, 0) / ranges.length;
    const consistencyScore = ranges.filter((r) => r >= CONSISTENCY_RANGE_THRESHOLD_PCT).length / ranges.length;
    const totalVolume = candles.reduce((sum, c) => sum + parseFloat(c.v), 0);

    return { coin, interval, sampleCount: candles.length, meanRangePct, consistencyScore, totalVolume };
  }
}
