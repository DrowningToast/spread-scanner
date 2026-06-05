import { hlClient } from "../client.js";
import { MarketsService } from "../services/marketsService.js";
import { OrderbookService } from "../services/orderbookService.js";
import { CandleService } from "../services/candleService.js";
import { printBidAskReport } from "../services/reportService.js";
import { parseArgs } from "../utils/args.js";
import type { CandleInterval, CandleRangeStats, BidAskSpread } from "../types.js";

const args = parseArgs();
const INTERVALS: CandleInterval[] = ["1m", "3m", "5m", "15m"];
const WINDOW_HOURS = args.window ?? parseFloat(process.env["WINDOW_HOURS"] ?? "1");
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;
const TOP_N = args.top ?? parseInt(process.env["TOP_N"] ?? "20", 10);
const SORT_BY = args.sort;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runBatch<T, R>(items: T[], fn: (item: T) => Promise<R>, size: number): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.all(items.slice(i, i + size).map(fn));
    results.push(...batch);
    if (i + size < items.length) await sleep(BATCH_DELAY_MS);
  }
  return results;
}

async function main() {
  console.log("Fetching active markets...");
  const marketsService = new MarketsService(hlClient);
  const orderbookService = new OrderbookService(hlClient);
  const candleService = new CandleService(hlClient);

  const markets = await marketsService.getActiveMarkets();
  const volumeMap = new Map(markets.map((m) => [m.coin, m.dayNtlVlm]));
  console.log(`Found ${markets.length} active markets. Fetching orderbooks...`);

  const spreadResults = await runBatch(
    markets,
    (m) => orderbookService.getSpread(m.coin),
    BATCH_SIZE,
  );

  const validSpreads = spreadResults
    .filter((s): s is BidAskSpread => s !== null)
    .sort((a, b) =>
      SORT_BY === "volume"
        ? (volumeMap.get(b.coin) ?? 0) - (volumeMap.get(a.coin) ?? 0)
        : b.spreadPct - a.spreadPct,
    )
    .slice(0, TOP_N);

  console.log(`Fetching candle data for top ${TOP_N} markets (sort: ${SORT_BY}) across ${INTERVALS.join(", ")} intervals...`);

  const candleStats = new Map<string, Partial<Record<CandleInterval, CandleRangeStats>>>();

  for (let i = 0; i < validSpreads.length; i++) {
    const sp = validSpreads[i];
    process.stdout.write(`  [${i + 1}/${validSpreads.length}] ${sp.coin}...`);
    const statsByInterval = await Promise.all(
      INTERVALS.map((interval) => candleService.getRangeStats(sp.coin, interval, WINDOW_MS)),
    );
    const statsMap: Partial<Record<CandleInterval, CandleRangeStats>> = {};
    for (let j = 0; j < INTERVALS.length; j++) {
      statsMap[INTERVALS[j]] = statsByInterval[j];
    }
    candleStats.set(sp.coin, statsMap);
    process.stdout.write(" done\n");
    if (i < validSpreads.length - 1) await sleep(200);
  }

  printBidAskReport(validSpreads, candleStats, INTERVALS, { windowHours: WINDOW_HOURS, topN: TOP_N, sort: SORT_BY });
}

main().catch(console.error);
