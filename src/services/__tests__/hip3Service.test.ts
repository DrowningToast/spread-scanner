import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hip3Service } from "../hip3Service.js";
import type { InfoClient } from "@nktkas/hyperliquid";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeDexEntry = (name: string): any => ({ name });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeDexMeta = (tickers: string[], dex: string, volumes: number[] = []): any => [
  {
    universe: tickers.map((t) => ({ name: `${dex}:${t}`, szDecimals: 4, maxLeverage: 10, marginTableId: 0 })),
    marginTables: [],
    collateralToken: 0,
  },
  tickers.map((_, i) => ({ dayNtlVlm: String(volumes[i] ?? 0) })),
];

const makeBook = (bid: string, ask: string) => ({
  coin: "test",
  time: Date.now(),
  levels: [
    [{ px: bid, sz: "1.0", n: 1 }],
    [{ px: ask, sz: "1.0", n: 1 }],
  ],
});

describe("Hip3Service", () => {
  let mockClient: Pick<InfoClient, "perpDexs" | "metaAndAssetCtxs" | "l2Book">;
  let service: Hip3Service;

  beforeEach(() => {
    mockClient = {
      perpDexs: vi.fn(),
      metaAndAssetCtxs: vi.fn(),
      l2Book: vi.fn(),
    };
    service = new Hip3Service(mockClient as InfoClient);
  });

  describe("getDexes", () => {
    it("returns dex names, filtering null entries", async () => {
      vi.mocked(mockClient.perpDexs).mockResolvedValue([
        makeDexEntry("xyz"),
        null,
        makeDexEntry("flx"),
        makeDexEntry(""),
      ]);

      expect(await service.getDexes()).toEqual(["xyz", "flx"]);
    });
  });

  describe("getHip3Spreads", () => {
    it("calculates bid-ask spread for a single dex market", async () => {
      vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue(makeDexMeta(["BTC"], "xyz"));
      vi.mocked(mockClient.l2Book).mockResolvedValue(makeBook("99900", "100100") as any);

      const groups = await service.getHip3Spreads(["xyz"]);

      expect(groups).toHaveLength(1);
      expect(groups[0].canonical).toBe("BTC");
      expect(groups[0].markets).toHaveLength(1);
      expect(groups[0].markets[0].dex).toBe("xyz");
      expect(groups[0].markets[0].ticker).toBe("BTC");
      expect(groups[0].markets[0].spreadPct).toBeCloseTo(0.2, 3);
    });

    it("reads dayNtlVlm from ctxs at the matching ticker index", async () => {
      vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue(makeDexMeta(["BTC"], "xyz", [462.9758]));
      vi.mocked(mockClient.l2Book).mockResolvedValue(makeBook("99900", "100100") as any);

      const groups = await service.getHip3Spreads(["xyz"]);

      expect(groups[0].markets[0].dayNtlVlm).toBeCloseTo(462.9758, 3);
    });

    it("uses the correct ctxs index when tickers are batched", async () => {
      vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue(makeDexMeta(["BTC", "ETH"], "xyz", [100, 200]));
      vi.mocked(mockClient.l2Book).mockResolvedValue(makeBook("100", "101") as any);

      const groups = await service.getHip3Spreads(["xyz"]);
      const btcMarket = groups.find((g) => g.canonical === "BTC")?.markets[0];
      const ethMarket = groups.find((g) => g.canonical === "ETH")?.markets[0];

      expect(btcMarket?.dayNtlVlm).toBeCloseTo(100, 3);
      expect(ethMarket?.dayNtlVlm).toBeCloseTo(200, 3);
    });

    it("defaults dayNtlVlm to 0 when ctxs entry is missing the field", async () => {
      vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue(makeDexMeta(["BTC"], "xyz", []));
      vi.mocked(mockClient.l2Book).mockResolvedValue(makeBook("100", "101") as any);

      const groups = await service.getHip3Spreads(["xyz"]);

      expect(groups[0].markets[0].dayNtlVlm).toBe(0);
    });

    it("groups SP500/USA500/US500 under the canonical name S&P500", async () => {
      vi.mocked(mockClient.metaAndAssetCtxs)
        .mockResolvedValueOnce(makeDexMeta(["SP500"], "xyz"))
        .mockResolvedValueOnce(makeDexMeta(["USA500"], "flx"))
        .mockResolvedValueOnce(makeDexMeta(["US500"], "km"));
      vi.mocked(mockClient.l2Book).mockResolvedValue(makeBook("5000", "5005") as any);

      const groups = await service.getHip3Spreads(["xyz", "flx", "km"]);

      expect(groups).toHaveLength(1);
      expect(groups[0].canonical).toBe("S&P500");
      expect(groups[0].markets).toHaveLength(3);
      expect(groups[0].markets.map((m) => m.dex)).toEqual(expect.arrayContaining(["xyz", "flx", "km"]));
    });

    it("omits markets where L2 book is null (no liquidity)", async () => {
      vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue(makeDexMeta(["BTC", "ETH"], "xyz"));
      vi.mocked(mockClient.l2Book)
        .mockResolvedValueOnce(makeBook("60000", "60060") as any)
        .mockResolvedValueOnce(null);

      const groups = await service.getHip3Spreads(["xyz"]);

      expect(groups).toHaveLength(1);
      expect(groups[0].canonical).toBe("BTC");
    });

    it("omits markets where orderbook has empty levels", async () => {
      vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue(makeDexMeta(["BTC"], "xyz"));
      vi.mocked(mockClient.l2Book).mockResolvedValue({
        coin: "xyz:BTC",
        time: Date.now(),
        levels: [[], []],
      } as any);

      const groups = await service.getHip3Spreads(["xyz"]);

      expect(groups).toHaveLength(0);
    });

    it("sorts groups by widest market spread descending", async () => {
      vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue(makeDexMeta(["BTC", "ETH"], "xyz"));
      vi.mocked(mockClient.l2Book)
        .mockResolvedValueOnce(makeBook("100", "100.01") as any)  // BTC: 0.01% spread
        .mockResolvedValueOnce(makeBook("100", "101") as any);    // ETH: 1% spread

      const groups = await service.getHip3Spreads(["xyz"]);

      expect(groups[0].canonical).toBe("ETH");
      expect(groups[1].canonical).toBe("BTC");
    });

    it("passes correct coin name to l2Book (dex:ticker format)", async () => {
      vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue(makeDexMeta(["SP500"], "xyz"));
      vi.mocked(mockClient.l2Book).mockResolvedValue(makeBook("5000", "5005") as any);

      await service.getHip3Spreads(["xyz"]);

      expect(mockClient.l2Book).toHaveBeenCalledWith({ coin: "xyz:SP500" });
    });
  });
});
