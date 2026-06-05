import { hlClient } from "../client.js";
import { MarketsService } from "../services/marketsService.js";
import { OrderbookService } from "../services/orderbookService.js";
import { printMonitorLeaderboard } from "../services/reportService.js";
import { parseArgs } from "../utils/args.js";
import type { BidAskSpread } from "../types.js";

const args = parseArgs();
const INTERVAL_SEC = args.interval ?? parseInt(process.env["INTERVAL_SEC"] ?? "60", 10);
const WINDOW_SEC = args.window ?? parseInt(process.env["WINDOW_SEC"] ?? "3600", 10);
const TOP_N = args.top ?? parseInt(process.env["TOP_N"] ?? "20", 10);
const SORT_BY = args.sort;
const CONCURRENCY = 10;

interface CoinHistory {
  spreads: number[];
}

const history = new Map<string, CoinHistory>();
let tick = 0;

async function runBatch<T, R>(items: T[], fn: (item: T) => Promise<R>, size: number): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.all(items.slice(i, i + size).map(fn));
    results.push(...batch);
  }
  return results;
}

async function poll(marketsService: MarketsService, orderbookService: OrderbookService) {
  tick++;
  const markets = await marketsService.getActiveMarkets();
  const volumeMap = new Map(markets.map((m) => [m.coin, m.dayNtlVlm]));

  const spreadResults = await runBatch(
    markets,
    (m) => orderbookService.getSpread(m.coin),
    CONCURRENCY,
  );

  const maxHistorySamples = Math.ceil(WINDOW_SEC / INTERVAL_SEC);

  for (const sp of spreadResults) {
    if (!sp) continue;
    const h = history.get(sp.coin) ?? { spreads: [] };
    h.spreads.push(sp.spreadPct);
    if (h.spreads.length > maxHistorySamples) h.spreads.shift();
    history.set(sp.coin, h);
  }

  const leaderboard = [...history.entries()]
    .map(([coin, h]) => {
      const current = h.spreads.at(-1) ?? 0;
      const avg = h.spreads.reduce((s, v) => s + v, 0) / h.spreads.length;
      const max = Math.max(...h.spreads);
      const threshold = 0.05;
      const consistency = h.spreads.filter((s) => s >= threshold).length / h.spreads.length;
      return { coin, currentPct: current, avgPct: avg, maxPct: max, consistency, samples: h.spreads.length, dayNtlVlm: volumeMap.get(coin) };
    })
    .sort((a, b) =>
      SORT_BY === "volume"
        ? (b.dayNtlVlm ?? 0) - (a.dayNtlVlm ?? 0)
        : b.avgPct - a.avgPct,
    )
    .slice(0, TOP_N);

  printMonitorLeaderboard(leaderboard, tick, WINDOW_SEC, INTERVAL_SEC, SORT_BY);
}

async function main() {
  const marketsService = new MarketsService(hlClient);
  const orderbookService = new OrderbookService(hlClient);

  console.log(`Starting monitor | interval=${INTERVAL_SEC}s | window=${WINDOW_SEC}s | top=${TOP_N} | sort=${SORT_BY}`);

  await poll(marketsService, orderbookService);
  setInterval(() => poll(marketsService, orderbookService), INTERVAL_SEC * 1000);
}

main().catch(console.error);
