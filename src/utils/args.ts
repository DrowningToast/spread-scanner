export type SortBy = "spread" | "volume" | "bull" | "bear";

export interface CliArgs {
  top: number | null;       // null = use env default; for scan-hip3 null = no limit
  sort: SortBy;             // default: spread
  dex: string[] | null;     // null = all DEXes; non-null = include only these
  excludeDex: string[];     // DEXes to drop (applied after dex include filter)
  window: number | null;    // null = use env default (hours for scan-bid-ask, seconds for monitors)
  interval: number | null;  // null = use env default (seconds for monitor scripts)
}

export function parseArgs(argv: string[] = process.argv.slice(2)): CliArgs {
  const result: CliArgs = {
    top: null,
    sort: "spread",
    dex: null,
    excludeDex: [],
    window: null,
    interval: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];

    if (flag === "--top" && next !== undefined) {
      const v = parseInt(next, 10);
      if (!isNaN(v) && v > 0) result.top = v;
      i++;
    } else if (flag === "--sort" && next !== undefined) {
      if (next === "volume") result.sort = "volume";
      else if (next === "bull") result.sort = "bull";
      else if (next === "bear") result.sort = "bear";
      else result.sort = "spread";
      i++;
    } else if (flag === "--dex" && next !== undefined) {
      result.dex = next.split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (flag === "--exclude-dex" && next !== undefined) {
      result.excludeDex = next.split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (flag === "--window" && next !== undefined) {
      const v = parseFloat(next);
      if (!isNaN(v) && v > 0) result.window = v;
      i++;
    } else if (flag === "--interval" && next !== undefined) {
      const v = parseInt(next, 10);
      if (!isNaN(v) && v > 0) result.interval = v;
      i++;
    }
  }

  return result;
}

export function applyDexFilter(dexes: string[], args: CliArgs): string[] {
  let filtered = dexes;
  if (args.dex !== null) filtered = filtered.filter((d) => args.dex!.includes(d));
  if (args.excludeDex.length > 0) filtered = filtered.filter((d) => !args.excludeDex.includes(d));
  return filtered;
}
