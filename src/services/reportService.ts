import Table from "cli-table3";
import chalk from "chalk";
import type { BidAskSpread, CandleInterval, CandleRangeStats, Hip3AssetGroup, Hip3MonitorRow, SpreadSnapshot } from "../types.js";
import type { DirectionRow, MarketDirectionSummary } from "./directionService.js";

const pct = (n: number, decimals = 4) => `${n.toFixed(decimals)}%`;
const bps = (n: number) => `${(n * 100).toFixed(1)}`;
const vol = (n: number) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};
const score = (n: number) => {
  const s = `${(n * 100).toFixed(0)}%`;
  if (n >= 0.8) return chalk.green(s);
  if (n >= 0.5) return chalk.yellow(s);
  return chalk.red(s);
};

export function printBidAskReport(
  spreads: BidAskSpread[],
  candleStats: Map<string, Partial<Record<CandleInterval, CandleRangeStats>>>,
  intervals: CandleInterval[],
  config: { windowHours: number; topN: number; sort: string },
): void {
  const volLabel = `Vol (${config.windowHours}h)`;
  const table = new Table({
    head: [
      chalk.bold("#"),
      chalk.bold("Asset"),
      chalk.bold("Bid-Ask%"),
      chalk.bold("Bps"),
      chalk.bold(volLabel),
      ...intervals.map((i) => chalk.bold(`${i} Range`)),
      ...intervals.map((i) => chalk.bold(`${i} Cons%`)),
    ],
    style: { head: [], border: [] },
  });

  for (let i = 0; i < spreads.length; i++) {
    const sp = spreads[i];
    const stats = candleStats.get(sp.coin) ?? {};
    const periodVol = intervals.length > 0 ? (stats[intervals[0]]?.totalVolume ?? 0) : 0;
    table.push([
      chalk.dim(String(i + 1)),
      chalk.cyan(sp.coin),
      chalk.yellow(pct(sp.spreadPct)),
      bps(sp.spreadPct),
      vol(periodVol),
      ...intervals.map((iv) => pct(stats[iv]?.meanRangePct ?? 0)),
      ...intervals.map((iv) => score(stats[iv]?.consistencyScore ?? 0)),
    ]);
  }

  const configLine = `Window: ${config.windowHours}h | Sort: ${config.sort} | Intervals: ${intervals.join(", ") || "none"} | Top: ${config.topN}`;
  console.log(chalk.bold.underline("\n Bid-Ask Spread Opportunities (ranked by spread)\n"));
  console.log(chalk.dim(` ${configLine}\n`));
  console.log(table.toString());
}

export function printHip3Report(groups: Hip3AssetGroup[]): void {
  const table = new Table({
    head: [chalk.bold("#"), chalk.bold("Asset"), chalk.bold("DEX"), chalk.bold("Bid"), chalk.bold("Ask"), chalk.bold("Spread%"), chalk.bold("Bps"), chalk.bold("Max Spread%"), chalk.bold("24h Vol")],
    style: { head: [], border: [] },
  });

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    const sorted = [...group.markets].sort((a, b) => b.spreadPct - a.spreadPct);
    const maxSpread = Math.max(...group.markets.map((m) => m.spreadPct));
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i];
      table.push([
        i === 0 ? chalk.dim(String(gi + 1)) : "",
        i === 0 ? chalk.cyan(group.canonical) : "",
        chalk.dim(m.dex) + chalk.gray(`:${m.ticker}`),
        m.bid.toFixed(4),
        m.ask.toFixed(4),
        chalk.yellow(pct(m.spreadPct)),
        bps(m.spreadPct),
        i === 0 ? chalk.yellow(pct(maxSpread)) : "",
        vol(m.dayNtlVlm),
      ]);
    }
  }

  console.log(chalk.bold.underline("\n HIP3 Bid-Ask Spread Opportunities (grouped by underlying asset)\n"));
  console.log(table.toString());
}

export function printMonitorSnapshot(snapshots: SpreadSnapshot[], tick: number, windowSec: number): void {
  const table = new Table({
    head: [
      chalk.bold("#"),
      chalk.bold("Asset"),
      chalk.bold("Current%"),
      chalk.bold("Bps"),
      chalk.bold("Avg%"),
      chalk.bold("Max%"),
      chalk.bold("Consistency"),
      chalk.bold("Samples"),
    ],
    style: { head: [], border: [] },
  });

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    table.push([
      chalk.dim(String(i + 1)),
      chalk.cyan(snap.coin),
      chalk.yellow(pct(snap.bidAskSpreadPct)),
      bps(snap.bidAskSpreadPct),
      pct(snap.bidAskSpreadPct),
      pct(snap.bidAskSpreadPct),
      score(1),
      "1",
    ]);
  }

  console.clear();
  console.log(chalk.bold(`\n Spread Monitor  |  Tick #${tick}  |  Window: ${windowSec}s\n`));
  console.log(table.toString());
}

export function printMonitorLeaderboard(
  leaderboard: { coin: string; currentPct: number; avgPct: number; maxPct: number; consistency: number; samples: number; dayNtlVlm?: number }[],
  tick: number,
  windowSec: number,
  intervalSec: number,
  sortBy: string = "spread",
): void {
  const table = new Table({
    head: [
      chalk.bold("#"),
      chalk.bold("Asset"),
      chalk.bold("Current%"),
      chalk.bold("Bps"),
      chalk.bold("Avg%"),
      chalk.bold("Max%"),
      chalk.bold("Consistency"),
      chalk.bold("Samples"),
      chalk.bold("24h Vol"),
    ],
    style: { head: [], border: [] },
  });

  for (let i = 0; i < leaderboard.length; i++) {
    const row = leaderboard[i];
    table.push([
      chalk.dim(String(i + 1)),
      chalk.cyan(row.coin),
      chalk.yellow(pct(row.currentPct)),
      bps(row.currentPct),
      pct(row.avgPct),
      pct(row.maxPct),
      score(row.consistency),
      String(row.samples),
      row.dayNtlVlm != null ? vol(row.dayNtlVlm) : "-",
    ]);
  }

  console.clear();
  console.log(chalk.bold(`\n Spread Monitor  |  Tick #${tick}  |  Interval: ${intervalSec}s  |  Window: ${windowSec}s  |  Sort: ${sortBy}\n`));
  console.log(table.toString());
}

export function printHip3MonitorLeaderboard(leaderboard: Hip3MonitorRow[], tick: number, windowSec: number, intervalSec: number, sortBy: string = "spread"): void {
  const table = new Table({
    head: [
      chalk.bold("#"),
      chalk.bold("Asset"),
      chalk.bold("Best DEX"),
      chalk.bold("Current%"),
      chalk.bold("Bps"),
      chalk.bold("Avg%"),
      chalk.bold("Max%"),
      chalk.bold("Consistency"),
      chalk.bold("Samples"),
      chalk.bold("24h Vol"),
    ],
    style: { head: [], border: [] },
  });

  for (let i = 0; i < leaderboard.length; i++) {
    const row = leaderboard[i];
    table.push([
      chalk.dim(String(i + 1)),
      chalk.cyan(row.canonical),
      chalk.dim(row.bestDex),
      chalk.yellow(pct(row.currentPct)),
      bps(row.currentPct),
      pct(row.avgPct),
      pct(row.maxPct),
      score(row.consistency),
      String(row.samples),
      vol(row.dayNtlVlm),
    ]);
  }

  console.clear();
  console.log(chalk.bold(`\n HIP-3 Spread Monitor  |  Tick #${tick}  |  Interval: ${intervalSec}s  |  Window: ${windowSec}s  |  Sort: ${sortBy}\n`));
  console.log(table.toString());
}

export function printDirectionMonitor(
  rows: DirectionRow[],
  summary: MarketDirectionSummary,
  tick: number,
  intervalSec: number,
  sortBy: string,
): void {
  const dirColor = (d: DirectionRow["direction"] | "NEUTRAL") =>
    d === "BULL" ? chalk.green : d === "BEAR" ? chalk.red : chalk.yellow;

  const scoreStr = (n: number) => {
    const s = n.toFixed(1);
    if (n > 20) return chalk.green(s);
    if (n < -20) return chalk.red(s);
    return chalk.yellow(s);
  };

  const chgStr = (n: number) => {
    const s = `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
    return n > 0 ? chalk.green(s) : n < 0 ? chalk.red(s) : chalk.dim(s);
  };

  const ratioStr = (n: number) => {
    const s = `${(n * 100).toFixed(0)}%`;
    if (n >= 0.6) return chalk.green(s);
    if (n <= 0.4) return chalk.red(s);
    return chalk.yellow(s);
  };

  const fundingStr = (n: number) => {
    const bps = (n * 1e4).toFixed(2);
    const s = `${n >= 0 ? "+" : ""}${bps}bps`;
    return n > 0.0001 ? chalk.green(s) : n < -0.0001 ? chalk.red(s) : chalk.dim(s);
  };

  const table = new Table({
    head: [
      chalk.bold("#"),
      chalk.bold("Asset"),
      chalk.bold("Direction"),
      chalk.bold("Score"),
      chalk.bold("Price"),
      chalk.bold("1h Chg"),
      chalk.bold("4h Chg"),
      chalk.bold("Bull%"),
      chalk.bold("Funding"),
      chalk.bold("24h Vol"),
    ],
    style: { head: [], border: [] },
  });

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const dc = dirColor(r.direction);
    table.push([
      chalk.dim(String(i + 1)),
      chalk.cyan(r.coin),
      dc(r.direction.padEnd(7)),
      scoreStr(r.directionScore),
      r.markPx < 1 ? r.markPx.toFixed(5) : r.markPx.toFixed(2),
      chgStr(r.priceChange1h),
      chgStr(r.priceChange4h),
      ratioStr(r.bullishCandleRatio),
      fundingStr(r.fundingRate),
      vol(r.dayNtlVlm),
    ]);
  }

  const sc = dirColor(summary.direction);
  const summaryLine =
    `Market: ${sc(summary.direction)}  Score: ${scoreStr(summary.score)}  ` +
    `[ ${chalk.green(`${summary.bullCount} BULL`)}  ${chalk.yellow(`${summary.neutralCount} NEUTRAL`)}  ${chalk.red(`${summary.bearCount} BEAR`)} ]`;

  console.clear();
  console.log(
    chalk.bold(`\n Market Direction Monitor  |  Tick #${tick}  |  Interval: ${intervalSec}s  |  Sort: ${sortBy}\n`),
  );
  console.log(` ${summaryLine}\n`);
  console.log(table.toString());
}
