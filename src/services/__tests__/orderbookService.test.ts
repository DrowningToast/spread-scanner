import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderbookService } from "../orderbookService.js";
import type { InfoClient } from "@nktkas/hyperliquid";

const makeBook = (bidPx: string, askPx: string) => ({
  coin: "BTC",
  time: Date.now(),
  levels: [
    [{ px: bidPx, sz: "1.0", n: 1 }],
    [{ px: askPx, sz: "1.0", n: 1 }],
  ] as [{ px: string; sz: string; n: number }[], { px: string; sz: string; n: number }[]],
});

describe("OrderbookService", () => {
  let mockClient: Pick<InfoClient, "l2Book">;
  let service: OrderbookService;

  beforeEach(() => {
    mockClient = { l2Book: vi.fn() };
    service = new OrderbookService(mockClient as InfoClient);
  });

  it("calculates bid-ask spread correctly", async () => {
    vi.mocked(mockClient.l2Book).mockResolvedValue(makeBook("99900", "100100"));

    const result = await service.getSpread("BTC");

    expect(result).not.toBeNull();
    expect(result!.bid).toBe(99900);
    expect(result!.ask).toBe(100100);
    expect(result!.mid).toBe(100000);
    expect(result!.spreadPct).toBeCloseTo(0.2, 3);
  });

  it("returns null when market does not exist", async () => {
    vi.mocked(mockClient.l2Book).mockResolvedValue(null);

    const result = await service.getSpread("NONEXISTENT");

    expect(result).toBeNull();
  });

  it("returns null when orderbook has no levels", async () => {
    vi.mocked(mockClient.l2Book).mockResolvedValue({
      coin: "BTC",
      time: Date.now(),
      levels: [[], []],
    });

    const result = await service.getSpread("BTC");

    expect(result).toBeNull();
  });

  it("handles very tight spread correctly", async () => {
    vi.mocked(mockClient.l2Book).mockResolvedValue(makeBook("1000.00", "1000.10"));

    const result = await service.getSpread("COIN");

    expect(result!.spreadPct).toBeCloseTo(0.01, 3);
  });
});
