import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarketsService, MIN_OI_USD, MIN_VOL_USD } from "../marketsService.js";
import type { InfoClient } from "@nktkas/hyperliquid";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeMeta = (names: string[]): any => ({
  universe: names.map((name) => ({ name, szDecimals: 4, maxLeverage: 50, marginTableId: 0 })),
  marginTables: [],
  collateralToken: 0,
});

const makeCtx = (oi: string, vol: string, mark: string, funding = "0.0001") => ({
  openInterest: oi,
  dayNtlVlm: vol,
  markPx: mark,
  midPx: mark,
  prevDayPx: mark,
  funding,
  premium: null,
  oraclePx: mark,
  impactPxs: null,
  dayBaseVlm: "0",
});

describe("MarketsService", () => {
  let mockClient: Pick<InfoClient, "metaAndAssetCtxs">;
  let service: MarketsService;

  beforeEach(() => {
    mockClient = { metaAndAssetCtxs: vi.fn() };
    service = new MarketsService(mockClient as InfoClient);
  });

  it("returns markets with parsed numeric fields", async () => {
    vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue([
      makeMeta(["BTC"]),
      [makeCtx("1000000", "50000000", "60000")],
    ]);

    const markets = await service.getActiveMarkets();

    expect(markets).toHaveLength(1);
    expect(markets[0].coin).toBe("BTC");
    expect(markets[0].openInterest).toBe(1000000);
    expect(markets[0].dayNtlVlm).toBe(50000000);
    expect(markets[0].markPx).toBe(60000);
    expect(markets[0].funding).toBe(0.0001);
  });

  it(`filters out markets below MIN_OI_USD ($${MIN_OI_USD.toLocaleString()})`, async () => {
    vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue([
      makeMeta(["SMALL", "BIG"]),
      [
        makeCtx(String(MIN_OI_USD - 1), String(MIN_VOL_USD + 1), "1"),
        makeCtx(String(MIN_OI_USD + 1), String(MIN_VOL_USD + 1), "1"),
      ],
    ]);

    const markets = await service.getActiveMarkets();

    expect(markets).toHaveLength(1);
    expect(markets[0].coin).toBe("BIG");
  });

  it(`filters out markets below MIN_VOL_USD ($${MIN_VOL_USD.toLocaleString()})`, async () => {
    vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue([
      makeMeta(["LOW_VOL", "HIGH_VOL"]),
      [
        makeCtx(String(MIN_OI_USD + 1), String(MIN_VOL_USD - 1), "1"),
        makeCtx(String(MIN_OI_USD + 1), String(MIN_VOL_USD + 1), "1"),
      ],
    ]);

    const markets = await service.getActiveMarkets();

    expect(markets).toHaveLength(1);
    expect(markets[0].coin).toBe("HIGH_VOL");
  });

  it("returns empty array when all markets are filtered out", async () => {
    vi.mocked(mockClient.metaAndAssetCtxs).mockResolvedValue([
      makeMeta(["TINY"]),
      [makeCtx("0", "0", "1")],
    ]);

    const markets = await service.getActiveMarkets();

    expect(markets).toHaveLength(0);
  });
});
