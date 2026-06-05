import { describe, it, expect, beforeEach } from "vitest";
import { Hip3MonitorService } from "../hip3MonitorService.js";
import type { Hip3AssetGroup } from "../../types.js";

const makeGroup = (canonical: string, markets: { dex: string; spreadPct: number; dayNtlVlm?: number }[]): Hip3AssetGroup => ({
  canonical,
  markets: markets.map(({ dex, spreadPct, dayNtlVlm = 0 }) => ({
    dex,
    ticker: canonical,
    canonical,
    bid: 100,
    ask: 100 + spreadPct,
    mid: 100 + spreadPct / 2,
    spreadPct,
    dayNtlVlm,
  })),
});

describe("Hip3MonitorService", () => {
  let service: Hip3MonitorService;

  beforeEach(() => {
    service = new Hip3MonitorService();
  });

  describe("updateHistory", () => {
    it("picks max spread across DEXes per asset", () => {
      const groups = [makeGroup("BTC", [{ dex: "dex1", spreadPct: 0.1 }, { dex: "dex2", spreadPct: 0.5 }])];
      service.updateHistory(groups, 10);
      const rows = service.getLeaderboard(10);
      expect(rows[0].currentPct).toBeCloseTo(0.5, 5);
    });

    it("tracks the bestDex as the one with max spread", () => {
      const groups = [makeGroup("BTC", [{ dex: "dex1", spreadPct: 0.1 }, { dex: "dex2", spreadPct: 0.5 }])];
      service.updateHistory(groups, 10);
      const rows = service.getLeaderboard(10);
      expect(rows[0].bestDex).toBe("dex2");
    });

    it("appends a new sample on each call", () => {
      const groups = [makeGroup("ETH", [{ dex: "dex1", spreadPct: 0.2 }])];
      service.updateHistory(groups, 10);
      service.updateHistory(groups, 10);
      const rows = service.getLeaderboard(10);
      expect(rows[0].samples).toBe(2);
    });

    it("prunes oldest samples when maxSamples is exceeded", () => {
      const groups = [makeGroup("SOL", [{ dex: "dex1", spreadPct: 0.3 }])];
      for (let i = 0; i < 5; i++) service.updateHistory(groups, 3);
      const rows = service.getLeaderboard(10);
      expect(rows[0].samples).toBe(3);
    });

    it("handles multiple assets independently", () => {
      const groups = [
        makeGroup("BTC", [{ dex: "dex1", spreadPct: 0.1 }]),
        makeGroup("ETH", [{ dex: "dex2", spreadPct: 0.2 }]),
      ];
      service.updateHistory(groups, 10);
      const rows = service.getLeaderboard(10);
      expect(rows).toHaveLength(2);
    });
  });

  describe("getLeaderboard", () => {
    it("computes avgPct as mean of recorded max-spreads", () => {
      service.updateHistory([makeGroup("BTC", [{ dex: "d", spreadPct: 0.2 }])], 10);
      service.updateHistory([makeGroup("BTC", [{ dex: "d", spreadPct: 0.4 }])], 10);
      const rows = service.getLeaderboard(10);
      expect(rows[0].avgPct).toBeCloseTo(0.3, 5);
    });

    it("computes maxPct as maximum of recorded max-spreads", () => {
      service.updateHistory([makeGroup("BTC", [{ dex: "d", spreadPct: 0.2 }])], 10);
      service.updateHistory([makeGroup("BTC", [{ dex: "d", spreadPct: 0.9 }])], 10);
      service.updateHistory([makeGroup("BTC", [{ dex: "d", spreadPct: 0.4 }])], 10);
      const rows = service.getLeaderboard(10);
      expect(rows[0].maxPct).toBeCloseTo(0.9, 5);
    });

    it("computes consistency as fraction of samples at or above 0.05%", () => {
      service.updateHistory([makeGroup("BTC", [{ dex: "d", spreadPct: 0.1 }])], 10);
      service.updateHistory([makeGroup("BTC", [{ dex: "d", spreadPct: 0.01 }])], 10);
      service.updateHistory([makeGroup("BTC", [{ dex: "d", spreadPct: 0.1 }])], 10);
      service.updateHistory([makeGroup("BTC", [{ dex: "d", spreadPct: 0.01 }])], 10);
      const rows = service.getLeaderboard(10);
      expect(rows[0].consistency).toBeCloseTo(0.5, 5);
    });

    it("sorts by avgPct descending", () => {
      const groups = [
        makeGroup("LOW", [{ dex: "d", spreadPct: 0.1 }]),
        makeGroup("HIGH", [{ dex: "d", spreadPct: 0.9 }]),
        makeGroup("MID", [{ dex: "d", spreadPct: 0.5 }]),
      ];
      service.updateHistory(groups, 10);
      const rows = service.getLeaderboard(10);
      expect(rows.map((r) => r.canonical)).toEqual(["HIGH", "MID", "LOW"]);
    });

    it("respects topN slice", () => {
      const groups = [
        makeGroup("A", [{ dex: "d", spreadPct: 0.1 }]),
        makeGroup("B", [{ dex: "d", spreadPct: 0.2 }]),
        makeGroup("C", [{ dex: "d", spreadPct: 0.3 }]),
      ];
      service.updateHistory(groups, 10);
      const rows = service.getLeaderboard(2);
      expect(rows).toHaveLength(2);
    });

    it("returns empty array when no history exists", () => {
      expect(service.getLeaderboard(10)).toEqual([]);
    });

    it("sums dayNtlVlm across all markets in the group", () => {
      const groups = [makeGroup("BTC", [
        { dex: "dex1", spreadPct: 0.5, dayNtlVlm: 1000 },
        { dex: "dex2", spreadPct: 0.2, dayNtlVlm: 2500 },
      ])];
      service.updateHistory(groups, 10);
      const rows = service.getLeaderboard(10);
      expect(rows[0].dayNtlVlm).toBeCloseTo(3500, 0);
    });

    it("updates dayNtlVlm to the latest tick's sum on each update", () => {
      service.updateHistory([makeGroup("BTC", [{ dex: "d", spreadPct: 0.1, dayNtlVlm: 1000 }])], 10);
      service.updateHistory([makeGroup("BTC", [{ dex: "d", spreadPct: 0.1, dayNtlVlm: 9999 }])], 10);
      const rows = service.getLeaderboard(10);
      expect(rows[0].dayNtlVlm).toBeCloseTo(9999, 0);
    });

    it("reflects the bestDex from the most recent tick", () => {
      service.updateHistory([makeGroup("BTC", [{ dex: "old-dex", spreadPct: 0.8 }])], 10);
      service.updateHistory([makeGroup("BTC", [{ dex: "new-dex", spreadPct: 0.3 }])], 10);
      const rows = service.getLeaderboard(10);
      expect(rows[0].bestDex).toBe("new-dex");
    });

    it("sorts by avgPct descending when sortBy is spread (default)", () => {
      const groups = [
        makeGroup("LOW_SPREAD",  [{ dex: "d", spreadPct: 0.1, dayNtlVlm: 9000 }]),
        makeGroup("HIGH_SPREAD", [{ dex: "d", spreadPct: 0.9, dayNtlVlm: 100  }]),
      ];
      service.updateHistory(groups, 10);
      const rows = service.getLeaderboard(10, "spread");
      expect(rows[0].canonical).toBe("HIGH_SPREAD");
    });

    it("sorts by dayNtlVlm descending when sortBy is volume", () => {
      const groups = [
        makeGroup("LOW_VOL",  [{ dex: "d", spreadPct: 0.9, dayNtlVlm: 100  }]),
        makeGroup("HIGH_VOL", [{ dex: "d", spreadPct: 0.1, dayNtlVlm: 9000 }]),
      ];
      service.updateHistory(groups, 10);
      const rows = service.getLeaderboard(10, "volume");
      expect(rows[0].canonical).toBe("HIGH_VOL");
    });

    it("respects topN after volume sort", () => {
      const groups = [
        makeGroup("A", [{ dex: "d", spreadPct: 0.1, dayNtlVlm: 3000 }]),
        makeGroup("B", [{ dex: "d", spreadPct: 0.2, dayNtlVlm: 2000 }]),
        makeGroup("C", [{ dex: "d", spreadPct: 0.3, dayNtlVlm: 1000 }]),
      ];
      service.updateHistory(groups, 10);
      const rows = service.getLeaderboard(2, "volume");
      expect(rows).toHaveLength(2);
      expect(rows[0].canonical).toBe("A");
    });
  });
});
