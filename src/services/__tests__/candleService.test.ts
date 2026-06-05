import { describe, it, expect, vi, beforeEach } from "vitest";
import { CandleService, CONSISTENCY_RANGE_THRESHOLD_PCT } from "../candleService.js";
import type { InfoClient } from "@nktkas/hyperliquid";

const makeCandle = (o: string, h: string, l: string, c: string, v = "1.0", t = Date.now()) => ({
  t,
  T: t + 60000,
  s: "BTC",
  i: "1m" as const,
  o,
  h,
  l,
  c,
  v,
  n: 10,
});

describe("CandleService", () => {
  let mockClient: Pick<InfoClient, "candleSnapshot">;
  let service: CandleService;

  beforeEach(() => {
    mockClient = { candleSnapshot: vi.fn() };
    service = new CandleService(mockClient as InfoClient);
  });

  it("calculates mean range percent correctly", async () => {
    vi.mocked(mockClient.candleSnapshot).mockResolvedValue([
      makeCandle("100", "102", "98", "100"),
      makeCandle("100", "103", "97", "100"),
    ]);

    const result = await service.getRangeStats("BTC", "1m", 3600000);

    // candle1: (102-98)/100*100=4%, candle2: (103-97)/100*100=6%, mean=5%
    expect(result.meanRangePct).toBeCloseTo(5, 1);
    expect(result.sampleCount).toBe(2);
  });

  it("marks candles above threshold as consistent", async () => {
    const aboveThreshold = CONSISTENCY_RANGE_THRESHOLD_PCT + 1;
    const belowThreshold = CONSISTENCY_RANGE_THRESHOLD_PCT - 0.5;

    vi.mocked(mockClient.candleSnapshot).mockResolvedValue([
      makeCandle("100", String(100 + aboveThreshold), "100", "100"),
      makeCandle("100", String(100 + aboveThreshold), "100", "100"),
      makeCandle("100", String(100 + belowThreshold), "100", "100"),
      makeCandle("100", String(100 + belowThreshold), "100", "100"),
    ]);

    const result = await service.getRangeStats("BTC", "1m", 3600000);

    expect(result.consistencyScore).toBe(0.5);
  });

  it("returns zero stats for empty candle array", async () => {
    vi.mocked(mockClient.candleSnapshot).mockResolvedValue([]);

    const result = await service.getRangeStats("BTC", "1m", 3600000);

    expect(result.meanRangePct).toBe(0);
    expect(result.consistencyScore).toBe(0);
    expect(result.sampleCount).toBe(0);
    expect(result.totalVolume).toBe(0);
  });

  it("sums candle volumes into totalVolume", async () => {
    vi.mocked(mockClient.candleSnapshot).mockResolvedValue([
      makeCandle("100", "101", "99", "100", "500000"),
      makeCandle("100", "101", "99", "100", "300000"),
      makeCandle("100", "101", "99", "100", "200000"),
    ]);

    const result = await service.getRangeStats("BTC", "1m", 3600000);

    expect(result.totalVolume).toBeCloseTo(1000000, 0);
  });

  it("returns totalVolume of zero for empty candles", async () => {
    vi.mocked(mockClient.candleSnapshot).mockResolvedValue([]);

    const result = await service.getRangeStats("BTC", "1m", 3600000);

    expect(result.totalVolume).toBe(0);
  });

  it("passes correct startTime to SDK", async () => {
    const now = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    vi.mocked(mockClient.candleSnapshot).mockResolvedValue([]);

    await service.getRangeStats("ETH", "5m", 1800000);

    expect(mockClient.candleSnapshot).toHaveBeenCalledWith({
      coin: "ETH",
      interval: "5m",
      startTime: now - 1800000,
    });
  });
});
