import { hlClient } from "../client.js";
import { Hip3Service } from "../services/hip3Service.js";
import { Hip3MonitorService } from "../services/hip3MonitorService.js";
import { printHip3MonitorLeaderboard } from "../services/reportService.js";
import { parseArgs, applyDexFilter } from "../utils/args.js";

const args = parseArgs();
const INTERVAL_SEC = args.interval ?? parseInt(process.env["INTERVAL_SEC"] ?? "60", 10);
const WINDOW_SEC = args.window ?? parseInt(process.env["WINDOW_SEC"] ?? "3600", 10);
const TOP_N = args.top ?? parseInt(process.env["TOP_N"] ?? "20", 10);
const SORT_BY = args.sort;

const maxSamples = Math.ceil(WINDOW_SEC / INTERVAL_SEC);
let tick = 0;

async function poll(hip3Service: Hip3Service, monitorService: Hip3MonitorService) {
  tick++;
  const allDexes = await hip3Service.getDexes();
  const dexes = applyDexFilter(allDexes, args);
  const groups = await hip3Service.getHip3Spreads(dexes);
  monitorService.updateHistory(groups, maxSamples);
  const leaderboard = monitorService.getLeaderboard(TOP_N, SORT_BY);
  printHip3MonitorLeaderboard(leaderboard, tick, WINDOW_SEC, INTERVAL_SEC, SORT_BY);
}

async function main() {
  const hip3Service = new Hip3Service(hlClient);
  const monitorService = new Hip3MonitorService();

  console.log(`Starting HIP-3 monitor | interval=${INTERVAL_SEC}s | window=${WINDOW_SEC}s | top=${TOP_N} | sort=${SORT_BY}`);

  await poll(hip3Service, monitorService);
  setInterval(() => poll(hip3Service, monitorService), INTERVAL_SEC * 1000);
}

main().catch(console.error);
