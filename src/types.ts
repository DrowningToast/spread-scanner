export type CandleInterval = "1m" | "3m" | "5m" | "15m" | "30m" | "1h";

export interface Market {
  coin: string;
  openInterest: number;
  dayNtlVlm: number;
  markPx: number;
  funding: number;
}

export interface BidAskSpread {
  coin: string;
  bid: number;
  ask: number;
  mid: number;
  spreadPct: number;
}

export interface CandleRangeStats {
  coin: string;
  interval: CandleInterval;
  sampleCount: number;
  meanRangePct: number;
  consistencyScore: number;
  totalVolume: number;
}

export interface SpreadSnapshot {
  coin: string;
  timestamp: number;
  bidAskSpreadPct: number;
  candleRanges: Partial<Record<CandleInterval, CandleRangeStats>>;
}

export interface Hip3MarketSpread {
  dex: string;
  ticker: string;
  canonical: string;
  bid: number;
  ask: number;
  mid: number;
  spreadPct: number;
  dayNtlVlm: number;
}

export interface Hip3AssetGroup {
  canonical: string;
  markets: Hip3MarketSpread[];
}

export interface Hip3MonitorRow {
  canonical: string;
  bestDex: string;
  currentPct: number;
  avgPct: number;
  maxPct: number;
  consistency: number;
  samples: number;
  dayNtlVlm: number;
}
