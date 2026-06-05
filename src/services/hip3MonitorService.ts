import type { Hip3AssetGroup, Hip3MonitorRow } from "../types.js";
import type { SortBy } from "../utils/args.js";

interface AssetHistory {
  spreads: number[];
  bestDex: string;
  dayNtlVlm: number;
}

const CONSISTENCY_THRESHOLD = 0.05;

export class Hip3MonitorService {
  private readonly history = new Map<string, AssetHistory>();

  updateHistory(groups: Hip3AssetGroup[], maxSamples: number): void {
    for (const group of groups) {
      if (group.markets.length === 0) continue;

      const best = group.markets.reduce((a, b) => (b.spreadPct > a.spreadPct ? b : a));
      const h = this.history.get(group.canonical) ?? { spreads: [], bestDex: best.dex, dayNtlVlm: 0 };

      h.spreads.push(best.spreadPct);
      if (h.spreads.length > maxSamples) h.spreads.shift();
      h.bestDex = best.dex;
      h.dayNtlVlm = group.markets.reduce((sum, m) => sum + m.dayNtlVlm, 0);

      this.history.set(group.canonical, h);
    }
  }

  getLeaderboard(topN: number, sortBy: SortBy = "spread"): Hip3MonitorRow[] {
    return [...this.history.entries()]
      .map(([canonical, h]) => {
        const currentPct = h.spreads.at(-1) ?? 0;
        const avgPct = h.spreads.reduce((s, v) => s + v, 0) / h.spreads.length;
        const maxPct = Math.max(...h.spreads);
        const consistency =
          h.spreads.filter((s) => s >= CONSISTENCY_THRESHOLD).length / h.spreads.length;
        return { canonical, bestDex: h.bestDex, currentPct, avgPct, maxPct, consistency, samples: h.spreads.length, dayNtlVlm: h.dayNtlVlm };
      })
      .sort((a, b) => sortBy === "volume" ? b.dayNtlVlm - a.dayNtlVlm : b.avgPct - a.avgPct)
      .slice(0, topN);
  }
}
