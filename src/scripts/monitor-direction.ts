import { hlClient } from "../client.js";
import { MarketsService } from "../services/marketsService.js";
import { DirectionService } from "../services/directionService.js";
import { printDirectionMonitor } from "../services/reportService.js";
import { parseArgs } from "../utils/args.js";
import type { DirectionRow } from "../services/directionService.js";

const args = parseArgs();
const INTERVAL_SEC = args.interval ?? parseInt(process.env["INTERVAL_SEC"] ?? "60", 10);
const TOP_N = args.top ?? parseInt(process.env["TOP_N"] ?? "30", 10);
const SORT_BY = args.sort as string;

let tick = 0;

function sortRows(rows: DirectionRow[], sortBy: string): DirectionRow[] {
  if (sortBy === "volume") return [...rows].sort((a, b) => b.dayNtlVlm - a.dayNtlVlm);
  if (sortBy === "bull") return [...rows].sort((a, b) => b.directionScore - a.directionScore);
  if (sortBy === "bear") return [...rows].sort((a, b) => a.directionScore - b.directionScore);
  // default: strongest signal first
  return [...rows].sort((a, b) => b.strength - a.strength);
}

async function poll(marketsService: MarketsService, directionService: DirectionService) {
  tick++;
  const markets = await marketsService.getActiveMarkets();
  const allRows = await directionService.getDirections(markets);
  const summary = directionService.summarize(allRows);
  const sorted = sortRows(allRows, SORT_BY).slice(0, TOP_N);
  printDirectionMonitor(sorted, summary, tick, INTERVAL_SEC, SORT_BY);
}

async function main() {
  const marketsService = new MarketsService(hlClient);
  const directionService = new DirectionService(hlClient);

  console.log(
    `Starting direction monitor | interval=${INTERVAL_SEC}s | top=${TOP_N} | sort=${SORT_BY}`,
  );

  await poll(marketsService, directionService);
  setInterval(() => poll(marketsService, directionService), INTERVAL_SEC * 1000);
}

main().catch(console.error);
