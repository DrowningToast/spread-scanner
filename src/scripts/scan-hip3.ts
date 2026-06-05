import { hlClient } from "../client.js";
import { Hip3Service } from "../services/hip3Service.js";
import { printHip3Report } from "../services/reportService.js";
import { parseArgs, applyDexFilter } from "../utils/args.js";

const args = parseArgs();
const TOP_N = args.top ?? 0;   // 0 = no limit
const SORT_BY = args.sort;

async function main() {
  const hip3Service = new Hip3Service(hlClient);

  const allDexes = await hip3Service.getDexes();
  const dexes = applyDexFilter(allDexes, args);

  if (dexes.length === 0) {
    console.error("No DEXes match the given filter. Available:", allDexes.join(", "));
    process.exit(1);
  }

  console.log(`Scanning ${dexes.length} DEX(es): ${dexes.join(", ")} | Sort: ${SORT_BY}${TOP_N ? ` | Top: ${TOP_N}` : ""}`);
  console.log("Fetching L2 orderbook for each HIP3 market...");

  let groups = await hip3Service.getHip3Spreads(dexes);

  if (SORT_BY === "volume") {
    groups = [...groups].sort(
      (a, b) =>
        b.markets.reduce((s, m) => s + m.dayNtlVlm, 0) -
        a.markets.reduce((s, m) => s + m.dayNtlVlm, 0),
    );
  }

  if (TOP_N > 0) groups = groups.slice(0, TOP_N);

  printHip3Report(groups);
  console.log(`\n${groups.length} unique underlying assets across ${dexes.length} DEX(es).`);
}

main().catch(console.error);
