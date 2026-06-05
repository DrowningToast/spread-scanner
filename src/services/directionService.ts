import type { InfoClient } from "@nktkas/hyperliquid";
import type { Market } from "../types.js";

export interface DirectionRow {
  coin: string;
  markPx: number;
  priceChange1h: number;
  priceChange4h: number;
  bullishCandleRatio: number;
  fundingRate: number;
  dayNtlVlm: number;
  openInterest: number;
  directionScore: number;
  direction: "BULL" | "BEAR" | "NEUTRAL";
  strength: number;
}

export interface MarketDirectionSummary {
  direction: "BULL" | "BEAR" | "NEUTRAL";
  score: number;
  bullCount: number;
  bearCount: number;
  neutralCount: number;
}

const DIRECTION_THRESHOLD = 20;
const CONCURRENCY = 10;

async function runBatch<T, R>(items: T[], fn: (item: T) => Promise<R>, size: number): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.all(items.slice(i, i + size).map(fn));
    results.push(...batch);
  }
  return results;
}

export class DirectionService {
  constructor(private readonly client: InfoClient) {}

  async getDirections(markets: Market[]): Promise<DirectionRow[]> {
    const rows = await runBatch(markets, (m) => this.computeDirection(m), CONCURRENCY);
    return rows.filter((r): r is DirectionRow => r !== null);
  }

  private async computeDirection(market: Market): Promise<DirectionRow | null> {
    try {
      const now = Date.now();
      const candles = await this.client.candleSnapshot({
        coin: market.coin,
        interval: "15m",
        startTime: now - 4 * 60 * 60 * 1000,
      });

      if (candles.length < 4) return null;

      const currentPrice = market.markPx;

      // Price N candles ago: 15m candles → 4 candles = 1h, all candles = ~4h
      const candle1hAgo = candles[Math.max(0, candles.length - 4)];
      const candle4hAgo = candles[0];

      const price1hAgo = parseFloat(candle1hAgo.o);
      const price4hAgo = parseFloat(candle4hAgo.o);

      const priceChange1h = price1hAgo > 0 ? ((currentPrice - price1hAgo) / price1hAgo) * 100 : 0;
      const priceChange4h = price4hAgo > 0 ? ((currentPrice - price4hAgo) / price4hAgo) * 100 : 0;

      const bullishCandleRatio =
        candles.filter((c) => parseFloat(c.c) > parseFloat(c.o)).length / candles.length;

      // Compute high/low range position (0 = at low, 1 = at high)
      const highs = candles.map((c) => parseFloat(c.h));
      const lows = candles.map((c) => parseFloat(c.l));
      const rangeHigh = Math.max(...highs);
      const rangeLow = Math.min(...lows);
      const rangePosition =
        rangeHigh > rangeLow ? (currentPrice - rangeLow) / (rangeHigh - rangeLow) : 0.5;

      // Weighted direction score: -100 to +100
      const score1h = clamp(priceChange1h * 8, -100, 100);     // 35%
      const score4h = clamp(priceChange4h * 4, -100, 100);     // 25%
      const scoreCandleRatio = (bullishCandleRatio - 0.5) * 200; // 20%
      const scoreRange = (rangePosition - 0.5) * 200;           // 10%
      // Funding: positive = longs dominant = mild bullish signal
      const fundingBps = market.funding * 1e4;
      const scoreFunding = clamp(fundingBps * 20, -50, 50);     // 10%

      const directionScore =
        score1h * 0.35 +
        score4h * 0.25 +
        scoreCandleRatio * 0.2 +
        scoreRange * 0.1 +
        scoreFunding * 0.1;

      const direction: DirectionRow["direction"] =
        directionScore > DIRECTION_THRESHOLD
          ? "BULL"
          : directionScore < -DIRECTION_THRESHOLD
            ? "BEAR"
            : "NEUTRAL";

      return {
        coin: market.coin,
        markPx: currentPrice,
        priceChange1h,
        priceChange4h,
        bullishCandleRatio,
        fundingRate: market.funding,
        dayNtlVlm: market.dayNtlVlm,
        openInterest: market.openInterest,
        directionScore,
        direction,
        strength: Math.abs(directionScore),
      };
    } catch {
      return null;
    }
  }

  summarize(rows: DirectionRow[]): MarketDirectionSummary {
    if (rows.length === 0) {
      return { direction: "NEUTRAL", score: 0, bullCount: 0, bearCount: 0, neutralCount: 0 };
    }

    const totalVol = rows.reduce((s, r) => s + r.dayNtlVlm, 0);
    const weightedScore =
      totalVol > 0
        ? rows.reduce((s, r) => s + r.directionScore * (r.dayNtlVlm / totalVol), 0)
        : rows.reduce((s, r) => s + r.directionScore, 0) / rows.length;

    return {
      direction:
        weightedScore > DIRECTION_THRESHOLD
          ? "BULL"
          : weightedScore < -DIRECTION_THRESHOLD
            ? "BEAR"
            : "NEUTRAL",
      score: weightedScore,
      bullCount: rows.filter((r) => r.direction === "BULL").length,
      bearCount: rows.filter((r) => r.direction === "BEAR").length,
      neutralCount: rows.filter((r) => r.direction === "NEUTRAL").length,
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
