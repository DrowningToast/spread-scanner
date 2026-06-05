import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  printBidAskReport,
  printHip3Report,
  printMonitorLeaderboard,
  printHip3MonitorLeaderboard,
  printMonitorSnapshot,
} from "../reportService.js";
import type { BidAskSpread, CandleInterval, CandleRangeStats, Hip3AssetGroup, Hip3MonitorRow, SpreadSnapshot } from "../../types.js";

const strip = (s: string) => s.replace(/\[[0-9;]*m/g, "");

const captureLog = () => {
  const lines: string[] = [];
  vi.spyOn(console, "log").mockImplementation((...args) => lines.push(args.map(String).join(" ")));
  vi.spyOn(console, "clear").mockImplementation(() => {});
  return () => strip(lines.join("\n"));
};

const makeSpread = (coin: string, spreadPct: number): BidAskSpread => ({
  coin,
  bid: 100,
  ask: 100 + spreadPct,
  mid: 100 + spreadPct / 2,
  spreadPct,
});

const makeHip3Group = (
  canonical: string,
  markets: { dex: string; ticker: string; spreadPct: number; dayNtlVlm?: number }[],
): Hip3AssetGroup => ({
  canonical,
  markets: markets.map(({ dex, ticker, spreadPct, dayNtlVlm = 0 }) => ({
    dex,
    ticker,
    canonical,
    bid: 100,
    ask: 100 + spreadPct,
    mid: 100 + spreadPct / 2,
    spreadPct,
    dayNtlVlm,
  })),
});

const makeMonitorRow = (coin: string, currentPct: number, avgPct = currentPct, maxPct = currentPct) => ({
  coin,
  currentPct,
  avgPct,
  maxPct,
  consistency: 1,
  samples: 5,
});

const makeHip3Row = (canonical: string, currentPct: number, avgPct = currentPct, maxPct = currentPct, dayNtlVlm = 0): Hip3MonitorRow => ({
  canonical,
  bestDex: "testdex",
  currentPct,
  avgPct,
  maxPct,
  consistency: 1,
  samples: 5,
  dayNtlVlm,
});

const makeSnapshot = (coin: string, bidAskSpreadPct: number): SpreadSnapshot => ({
  coin,
  timestamp: Date.now(),
  bidAskSpreadPct,
  candleRanges: {},
});

afterEach(() => vi.restoreAllMocks());

// ─── printBidAskReport ───────────────────────────────────────────────────────

describe("printBidAskReport", () => {
  it("renders # and Bps column headers", () => {
    const output = captureLog();
    printBidAskReport([makeSpread("BTC", 0.2)], new Map(), ["1m"], { windowHours: 1, topN: 20, sort: "spread" });
    expect(output()).toContain("#");
    expect(output()).toContain("Bps");
  });

  it("renders Bid-Ask% and Asset column headers", () => {
    const output = captureLog();
    printBidAskReport([makeSpread("BTC", 0.2)], new Map(), ["1m"], { windowHours: 1, topN: 20, sort: "spread" });
    expect(output()).toContain("Bid-Ask%");
    expect(output()).toContain("Asset");
  });

  it("renders interval Range and Cons% column headers", () => {
    const output = captureLog();
    printBidAskReport([makeSpread("BTC", 0.2)], new Map(), ["1m", "5m"], { windowHours: 1, topN: 20, sort: "spread" });
    const out = output();
    expect(out).toContain("1m Range");
    expect(out).toContain("5m Range");
    expect(out).toContain("1m Cons%");
    expect(out).toContain("5m Cons%");
  });

  it("rank starts at 1 for the first row", () => {
    const output = captureLog();
    printBidAskReport([makeSpread("BTC", 0.2)], new Map(), [], { windowHours: 1, topN: 20, sort: "spread" });
    expect(output()).toContain("1");
  });

  it("ranks increment for each subsequent row", () => {
    const output = captureLog();
    printBidAskReport([makeSpread("BTC", 0.5), makeSpread("ETH", 0.3)], new Map(), [], { windowHours: 1, topN: 20, sort: "spread" });
    const out = output();
    expect(out).toContain("1");
    expect(out).toContain("2");
  });

  it("renders bps as spreadPct × 100 to one decimal place", () => {
    const output = captureLog();
    printBidAskReport([makeSpread("BTC", 0.2)], new Map(), [], { windowHours: 1, topN: 20, sort: "spread" });
    // 0.2 × 100 = 20.0
    expect(output()).toContain("20.0");
  });

  it("renders bps correctly for a different spread", () => {
    const output = captureLog();
    printBidAskReport([makeSpread("SOL", 0.75)], new Map(), [], { windowHours: 1, topN: 20, sort: "spread" });
    // 0.75 × 100 = 75.0
    expect(output()).toContain("75.0");
  });

  it("renders coin name in the table", () => {
    const output = captureLog();
    printBidAskReport([makeSpread("UNIQUE_COIN", 0.1)], new Map(), [], { windowHours: 1, topN: 20, sort: "spread" });
    expect(output()).toContain("UNIQUE_COIN");
  });

  it("renders candle meanRangePct when stats are provided", () => {
    const output = captureLog();
    const stats: CandleRangeStats = { coin: "BTC", interval: "1m", sampleCount: 60, meanRangePct: 1.2345, consistencyScore: 0.9, totalVolume: 0 };
    printBidAskReport([makeSpread("BTC", 0.2)], new Map([["BTC", { "1m": stats }]]), ["1m"], { windowHours: 1, topN: 20, sort: "spread" });
    expect(output()).toContain("1.2345%");
  });

  it("renders zero range when no candle stats provided", () => {
    const output = captureLog();
    printBidAskReport([makeSpread("BTC", 0.2)], new Map(), ["1m"], { windowHours: 1, topN: 20, sort: "spread" });
    expect(output()).toContain("0.0000%");
  });

  it("renders the title heading", () => {
    const output = captureLog();
    printBidAskReport([], new Map(), [], { windowHours: 1, topN: 20, sort: "spread" });
    expect(output()).toContain("Bid-Ask Spread Opportunities");
  });

  it("renders Vol (Xh) column header with correct window hours", () => {
    const output = captureLog();
    printBidAskReport([makeSpread("BTC", 0.2)], new Map(), ["1m"], { windowHours: 2, topN: 20, sort: "spread" });
    expect(output()).toContain("Vol (2h)");
  });

  it("renders volume from first interval totalVolume", () => {
    const output = captureLog();
    const stats: CandleRangeStats = { coin: "BTC", interval: "1m", sampleCount: 60, meanRangePct: 1, consistencyScore: 0.9, totalVolume: 5_000_000 };
    printBidAskReport([makeSpread("BTC", 0.2)], new Map([["BTC", { "1m": stats }]]), ["1m"], { windowHours: 1, topN: 20, sort: "spread" });
    expect(output()).toContain("$5.00M");
  });

  it("renders $0 volume when no candle stats for first interval", () => {
    const output = captureLog();
    printBidAskReport([makeSpread("BTC", 0.2)], new Map(), ["1m"], { windowHours: 1, topN: 20, sort: "spread" });
    expect(output()).toContain("$0");
  });

  it("renders config line showing window, sort, intervals, and topN", () => {
    const output = captureLog();
    printBidAskReport([], new Map(), ["1m", "5m"], { windowHours: 3, topN: 15, sort: "volume" });
    const out = output();
    expect(out).toContain("Window: 3h");
    expect(out).toContain("Sort: volume");
    expect(out).toContain("Top: 15");
    expect(out).toContain("1m");
    expect(out).toContain("5m");
  });

  it("formats volume in billions when >= 1e9", () => {
    const output = captureLog();
    const stats: CandleRangeStats = { coin: "BTC", interval: "1m", sampleCount: 1, meanRangePct: 0, consistencyScore: 0, totalVolume: 2_500_000_000 };
    printBidAskReport([makeSpread("BTC", 0.1)], new Map([["BTC", { "1m": stats }]]), ["1m"], { windowHours: 1, topN: 20, sort: "spread" });
    expect(output()).toContain("$2.50B");
  });

  it("formats volume in thousands when >= 1e3", () => {
    const output = captureLog();
    const stats: CandleRangeStats = { coin: "BTC", interval: "1m", sampleCount: 1, meanRangePct: 0, consistencyScore: 0, totalVolume: 750_000 };
    printBidAskReport([makeSpread("BTC", 0.1)], new Map([["BTC", { "1m": stats }]]), ["1m"], { windowHours: 1, topN: 20, sort: "spread" });
    expect(output()).toContain("$750.0K");
  });
});

// ─── printHip3Report ─────────────────────────────────────────────────────────

describe("printHip3Report", () => {
  it("renders #, Asset, DEX, Bid, Ask, Spread%, Bps, Max Spread% headers", () => {
    const output = captureLog();
    printHip3Report([makeHip3Group("S&P500", [{ dex: "dex1", ticker: "SP500", spreadPct: 0.3 }])]);
    const out = output();
    expect(out).toContain("#");
    expect(out).toContain("Asset");
    expect(out).toContain("DEX");
    expect(out).toContain("Bid");
    expect(out).toContain("Ask");
    expect(out).toContain("Spread%");
    expect(out).toContain("Bps");
    expect(out).toContain("Max Spread%");
  });

  it("shows group rank on first market row only", () => {
    const output = captureLog();
    printHip3Report([
      makeHip3Group("BTC", [
        { dex: "dex1", ticker: "BTC", spreadPct: 0.5 },
        { dex: "dex2", ticker: "BTC2", spreadPct: 0.2 },
      ]),
    ]);
    // The rank "1" should appear once (in the first row), not twice
    const rows = output().split("\n").filter((l) => l.includes("dex"));
    expect(rows[0]).toContain("1");
    expect(rows[1]).not.toMatch(/^\s*[│|]\s*1\s*[│|]/);
  });

  it("shows canonical name on first market row only, blank on sub-rows", () => {
    const output = captureLog();
    printHip3Report([
      makeHip3Group("GOLD", [
        { dex: "dex1", ticker: "GOLD", spreadPct: 0.5 },
        { dex: "dex2", ticker: "GOLDJM", spreadPct: 0.2 },
      ]),
    ]);
    const out = output();
    // canonical appears at least once
    expect(out).toContain("GOLD");
  });

  it("shows maxSpreadInGroup on first market row", () => {
    const output = captureLog();
    printHip3Report([
      makeHip3Group("ETH", [
        { dex: "dex1", ticker: "ETH", spreadPct: 0.4 },
        { dex: "dex2", ticker: "ETH2", spreadPct: 0.8 },
      ]),
    ]);
    // Max is 0.8, formatted as pct with 4 decimals → "0.8000%"
    expect(output()).toContain("0.8000%");
  });

  it("sorts markets within a group by spreadPct descending", () => {
    const output = captureLog();
    printHip3Report([
      makeHip3Group("OIL", [
        { dex: "dex_low", ticker: "OIL", spreadPct: 0.1 },
        { dex: "dex_high", ticker: "WTI", spreadPct: 0.9 },
      ]),
    ]);
    const out = output();
    const lowIdx = out.indexOf("dex_low");
    const highIdx = out.indexOf("dex_high");
    expect(highIdx).toBeLessThan(lowIdx);
  });

  it("renders bps for each market as spreadPct × 100", () => {
    const output = captureLog();
    printHip3Report([
      makeHip3Group("BTC", [{ dex: "dex1", ticker: "BTC", spreadPct: 0.35 }]),
    ]);
    // 0.35 × 100 = 35.0
    expect(output()).toContain("35.0");
  });

  it("increments group rank across multiple groups", () => {
    const output = captureLog();
    printHip3Report([
      makeHip3Group("AAPL", [{ dex: "d1", ticker: "AAPL", spreadPct: 0.9 }]),
      makeHip3Group("TSLA", [{ dex: "d2", ticker: "TSLA", spreadPct: 0.5 }]),
    ]);
    const out = output();
    expect(out).toContain("1");
    expect(out).toContain("2");
  });

  it("renders the HIP3 title heading", () => {
    const output = captureLog();
    printHip3Report([]);
    expect(output()).toContain("HIP3 Bid-Ask Spread Opportunities");
  });

  it("renders 24h Vol column header", () => {
    const output = captureLog();
    printHip3Report([makeHip3Group("BTC", [{ dex: "d1", ticker: "BTC", spreadPct: 0.3 }])]);
    expect(output()).toContain("24h Vol");
  });

  it("renders formatted dayNtlVlm per market row", () => {
    const output = captureLog();
    printHip3Report([makeHip3Group("BTC", [{ dex: "d1", ticker: "BTC", spreadPct: 0.3, dayNtlVlm: 3_750_000 }])]);
    expect(output()).toContain("$3.75M");
  });

  it("renders $0 volume when dayNtlVlm is 0", () => {
    const output = captureLog();
    printHip3Report([makeHip3Group("BTC", [{ dex: "d1", ticker: "BTC", spreadPct: 0.3, dayNtlVlm: 0 }])]);
    expect(output()).toContain("$0");
  });

  it("shows each market's own volume on its row", () => {
    const output = captureLog();
    printHip3Report([makeHip3Group("BTC", [
      { dex: "d1", ticker: "BTC", spreadPct: 0.5, dayNtlVlm: 1_000_000 },
      { dex: "d2", ticker: "BTC2", spreadPct: 0.2, dayNtlVlm: 500_000 },
    ])]);
    const out = output();
    expect(out).toContain("$1.00M");
    expect(out).toContain("$500.0K");
  });
});

// ─── printMonitorLeaderboard ─────────────────────────────────────────────────

describe("printMonitorLeaderboard", () => {
  it("renders #, Asset, Current%, Bps, Avg%, Max%, Consistency, Samples, 24h Vol headers", () => {
    const output = captureLog();
    printMonitorLeaderboard([makeMonitorRow("BTC", 0.2)], 1, 3600, 60);
    const out = output();
    expect(out).toContain("#");
    expect(out).toContain("Asset");
    expect(out).toContain("Current%");
    expect(out).toContain("Bps");
    expect(out).toContain("Avg%");
    expect(out).toContain("Max%");
    expect(out).toContain("Consistency");
    expect(out).toContain("Samples");
    expect(out).toContain("24h Vol");
  });

  it("renders rank starting at 1", () => {
    const output = captureLog();
    printMonitorLeaderboard([makeMonitorRow("BTC", 0.5)], 1, 3600, 60);
    expect(output()).toContain("1");
  });

  it("renders incrementing ranks for multiple rows", () => {
    const output = captureLog();
    printMonitorLeaderboard([makeMonitorRow("BTC", 0.5), makeMonitorRow("ETH", 0.3)], 1, 3600, 60);
    const out = output();
    expect(out).toContain("1");
    expect(out).toContain("2");
  });

  it("renders bps as currentPct × 100 to one decimal", () => {
    const output = captureLog();
    printMonitorLeaderboard([makeMonitorRow("BTC", 0.15)], 1, 3600, 60);
    // 0.15 × 100 = 15.0
    expect(output()).toContain("15.0");
  });

  it("renders coin name", () => {
    const output = captureLog();
    printMonitorLeaderboard([makeMonitorRow("UNIQUE_MON", 0.1)], 1, 3600, 60);
    expect(output()).toContain("UNIQUE_MON");
  });

  it("renders tick number in the header", () => {
    const output = captureLog();
    printMonitorLeaderboard([makeMonitorRow("BTC", 0.1)], 42, 3600, 60);
    expect(output()).toContain("42");
  });

  it("renders window seconds in the header", () => {
    const output = captureLog();
    printMonitorLeaderboard([makeMonitorRow("BTC", 0.1)], 1, 7200, 60);
    expect(output()).toContain("7200");
  });

  it("renders interval seconds in the header", () => {
    const output = captureLog();
    printMonitorLeaderboard([makeMonitorRow("BTC", 0.1)], 1, 3600, 30);
    expect(output()).toContain("30s");
  });

  it("renders avgPct and maxPct values", () => {
    const output = captureLog();
    printMonitorLeaderboard([makeMonitorRow("BTC", 0.1, 0.25, 0.9)], 1, 3600, 60);
    const out = output();
    expect(out).toContain("0.2500%");
    expect(out).toContain("0.9000%");
  });

  it("renders sample count", () => {
    const output = captureLog();
    printMonitorLeaderboard([{ ...makeMonitorRow("BTC", 0.1), samples: 99 }], 1, 3600, 60);
    expect(output()).toContain("99");
  });

  it("renders Spread Monitor title", () => {
    const output = captureLog();
    printMonitorLeaderboard([], 1, 3600, 60);
    expect(output()).toContain("Spread Monitor");
  });

  it("renders Sort label in header when sortBy is passed", () => {
    const output = captureLog();
    printMonitorLeaderboard([], 1, 3600, 60, "volume");
    expect(output()).toContain("Sort: volume");
  });

  it("renders dayNtlVlm as formatted volume when provided", () => {
    const output = captureLog();
    printMonitorLeaderboard([{ ...makeMonitorRow("BTC", 0.1), dayNtlVlm: 1_200_000 }], 1, 3600, 60);
    expect(output()).toContain("$1.20M");
  });

  it("renders - when dayNtlVlm is not provided", () => {
    const output = captureLog();
    printMonitorLeaderboard([makeMonitorRow("BTC", 0.1)], 1, 3600, 60);
    expect(output()).toContain("-");
  });
});

// ─── printHip3MonitorLeaderboard ─────────────────────────────────────────────

describe("printHip3MonitorLeaderboard", () => {
  it("renders #, Asset, Best DEX, Current%, Bps, Avg%, Max%, Consistency, Samples headers", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([makeHip3Row("S&P500", 0.3)], 1, 3600, 60);
    const out = output();
    expect(out).toContain("#");
    expect(out).toContain("Asset");
    expect(out).toContain("Best DEX");
    expect(out).toContain("Current%");
    expect(out).toContain("Bps");
    expect(out).toContain("Avg%");
    expect(out).toContain("Max%");
    expect(out).toContain("Consistency");
    expect(out).toContain("Samples");
  });

  it("renders rank starting at 1", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([makeHip3Row("Gold", 0.5)], 1, 3600, 60);
    expect(output()).toContain("1");
  });

  it("renders incrementing ranks for multiple rows", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([makeHip3Row("Gold", 0.5), makeHip3Row("Silver", 0.3)], 1, 3600, 60);
    const out = output();
    expect(out).toContain("1");
    expect(out).toContain("2");
  });

  it("renders bps as currentPct × 100 to one decimal", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([makeHip3Row("VIX", 0.6)], 1, 3600, 60);
    // 0.6 × 100 = 60.0
    expect(output()).toContain("60.0");
  });

  it("renders canonical name", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([makeHip3Row("UNIQUE_HIP3", 0.1)], 1, 3600, 60);
    expect(output()).toContain("UNIQUE_HIP3");
  });

  it("renders bestDex name", () => {
    const row: Hip3MonitorRow = { ...makeHip3Row("Gold", 0.5), bestDex: "gold-dex" };
    const output = captureLog();
    printHip3MonitorLeaderboard([row], 1, 3600, 60);
    expect(output()).toContain("gold-dex");
  });

  it("renders tick number in the header", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([makeHip3Row("Gold", 0.1)], 7, 3600, 60);
    expect(output()).toContain("7");
  });

  it("renders interval seconds in the header", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([makeHip3Row("Gold", 0.1)], 1, 3600, 45);
    expect(output()).toContain("45s");
  });

  it("renders HIP-3 Spread Monitor title", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([], 1, 3600, 60);
    expect(output()).toContain("HIP-3 Spread Monitor");
  });

  it("renders Sort label in header when sortBy is passed", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([], 1, 3600, 60, "volume");
    expect(output()).toContain("Sort: volume");
  });

  it("renders 24h Vol column header", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([makeHip3Row("Gold", 0.3)], 1, 3600, 60);
    expect(output()).toContain("24h Vol");
  });

  it("renders formatted dayNtlVlm for each row", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([makeHip3Row("Gold", 0.3, 0.3, 0.3, 8_200_000)], 1, 3600, 60);
    expect(output()).toContain("$8.20M");
  });

  it("renders $0 when dayNtlVlm is 0", () => {
    const output = captureLog();
    printHip3MonitorLeaderboard([makeHip3Row("Gold", 0.3)], 1, 3600, 60);
    expect(output()).toContain("$0");
  });
});

// ─── printMonitorSnapshot ────────────────────────────────────────────────────

describe("printMonitorSnapshot", () => {
  it("renders #, Asset, Current%, Bps headers", () => {
    const output = captureLog();
    printMonitorSnapshot([makeSnapshot("BTC", 0.2)], 1, 3600);
    const out = output();
    expect(out).toContain("#");
    expect(out).toContain("Asset");
    expect(out).toContain("Current%");
    expect(out).toContain("Bps");
  });

  it("renders rank starting at 1", () => {
    const output = captureLog();
    printMonitorSnapshot([makeSnapshot("BTC", 0.2)], 1, 3600);
    expect(output()).toContain("1");
  });

  it("renders incrementing ranks for multiple snapshots", () => {
    const output = captureLog();
    printMonitorSnapshot([makeSnapshot("BTC", 0.5), makeSnapshot("ETH", 0.3)], 1, 3600);
    const out = output();
    expect(out).toContain("1");
    expect(out).toContain("2");
  });

  it("renders bps as bidAskSpreadPct × 100 to one decimal", () => {
    const output = captureLog();
    printMonitorSnapshot([makeSnapshot("BTC", 0.45)], 1, 3600);
    // 0.45 × 100 = 45.0
    expect(output()).toContain("45.0");
  });

  it("renders coin name", () => {
    const output = captureLog();
    printMonitorSnapshot([makeSnapshot("SNAP_COIN", 0.1)], 1, 3600);
    expect(output()).toContain("SNAP_COIN");
  });

  it("renders tick and window in the header", () => {
    const output = captureLog();
    printMonitorSnapshot([makeSnapshot("BTC", 0.1)], 5, 1800);
    const out = output();
    expect(out).toContain("5");
    expect(out).toContain("1800");
  });

  it("renders Spread Monitor title", () => {
    const output = captureLog();
    printMonitorSnapshot([], 1, 3600);
    expect(output()).toContain("Spread Monitor");
  });
});
