import { describe, it, expect } from "vitest";
import { getCanonicalName } from "../aliases.js";

describe("getCanonicalName", () => {
  it("resolves SP500 → S&P500", () => {
    expect(getCanonicalName("SP500")).toBe("S&P500");
  });

  it("resolves USA500 → S&P500", () => {
    expect(getCanonicalName("USA500")).toBe("S&P500");
  });

  it("resolves US500 → S&P500", () => {
    expect(getCanonicalName("US500")).toBe("S&P500");
  });

  it("is case-insensitive", () => {
    expect(getCanonicalName("sp500")).toBe("S&P500");
    expect(getCanonicalName("usa500")).toBe("S&P500");
  });

  it("returns the ticker unchanged when no alias exists", () => {
    expect(getCanonicalName("BTC")).toBe("BTC");
    expect(getCanonicalName("ETH")).toBe("ETH");
  });

  it("resolves Nasdaq aliases", () => {
    expect(getCanonicalName("USA100")).toBe("Nasdaq");
    expect(getCanonicalName("USTECH")).toBe("Nasdaq");
    expect(getCanonicalName("XYZ100")).toBe("Nasdaq");
  });

  it("resolves Gold aliases", () => {
    expect(getCanonicalName("GOLD")).toBe("Gold");
    expect(getCanonicalName("GOLDJM")).toBe("Gold");
  });
});
