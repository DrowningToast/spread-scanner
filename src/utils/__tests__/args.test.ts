import { describe, it, expect } from "vitest";
import { parseArgs, applyDexFilter } from "../args.js";

// ─── parseArgs ───────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns all defaults when no args given", () => {
    const result = parseArgs([]);
    expect(result.top).toBeNull();
    expect(result.sort).toBe("spread");
    expect(result.dex).toBeNull();
    expect(result.excludeDex).toEqual([]);
    expect(result.window).toBeNull();
    expect(result.interval).toBeNull();
  });

  it("parses --top as a positive integer", () => {
    expect(parseArgs(["--top", "10"]).top).toBe(10);
  });

  it("ignores --top with a non-numeric value", () => {
    expect(parseArgs(["--top", "abc"]).top).toBeNull();
  });

  it("ignores --top 0 (not a valid count)", () => {
    expect(parseArgs(["--top", "0"]).top).toBeNull();
  });

  it("parses --sort volume", () => {
    expect(parseArgs(["--sort", "volume"]).sort).toBe("volume");
  });

  it("parses --sort spread", () => {
    expect(parseArgs(["--sort", "spread"]).sort).toBe("spread");
  });

  it("defaults sort to spread for unrecognised value", () => {
    expect(parseArgs(["--sort", "random"]).sort).toBe("spread");
  });

  it("parses --dex as a single name", () => {
    expect(parseArgs(["--dex", "xyz"]).dex).toEqual(["xyz"]);
  });

  it("parses --dex as a comma-separated list", () => {
    expect(parseArgs(["--dex", "xyz,flx,km"]).dex).toEqual(["xyz", "flx", "km"]);
  });

  it("trims whitespace in --dex list", () => {
    expect(parseArgs(["--dex", " xyz , flx "]).dex).toEqual(["xyz", "flx"]);
  });

  it("parses --exclude-dex as a comma-separated list", () => {
    expect(parseArgs(["--exclude-dex", "xyz,flx"]).excludeDex).toEqual(["xyz", "flx"]);
  });

  it("parses --window as a float", () => {
    expect(parseArgs(["--window", "2.5"]).window).toBeCloseTo(2.5);
  });

  it("ignores --window with non-numeric value", () => {
    expect(parseArgs(["--window", "bad"]).window).toBeNull();
  });

  it("parses --interval as an integer", () => {
    expect(parseArgs(["--interval", "30"]).interval).toBe(30);
  });

  it("ignores --interval 0", () => {
    expect(parseArgs(["--interval", "0"]).interval).toBeNull();
  });

  it("parses multiple flags together", () => {
    const result = parseArgs(["--top", "5", "--sort", "volume", "--dex", "xyz", "--exclude-dex", "flx", "--window", "2", "--interval", "30"]);
    expect(result.top).toBe(5);
    expect(result.sort).toBe("volume");
    expect(result.dex).toEqual(["xyz"]);
    expect(result.excludeDex).toEqual(["flx"]);
    expect(result.window).toBeCloseTo(2);
    expect(result.interval).toBe(30);
  });

  it("ignores flags missing their value at end of argv", () => {
    const result = parseArgs(["--top"]);
    expect(result.top).toBeNull();
  });

  it("ignores unrecognised flags without throwing", () => {
    expect(() => parseArgs(["--unknown", "foo"])).not.toThrow();
  });
});

// ─── applyDexFilter ──────────────────────────────────────────────────────────

describe("applyDexFilter", () => {
  const allDexes = ["xyz", "flx", "km", "abcd"];
  const baseArgs = { top: null, sort: "spread" as const, dex: null, excludeDex: [], window: null, interval: null };

  it("returns all dexes when dex and excludeDex are both unset", () => {
    expect(applyDexFilter(allDexes, baseArgs)).toEqual(allDexes);
  });

  it("filters to only included dexes when --dex is set", () => {
    expect(applyDexFilter(allDexes, { ...baseArgs, dex: ["xyz", "flx"] })).toEqual(["xyz", "flx"]);
  });

  it("excludes specified dexes when --exclude-dex is set", () => {
    expect(applyDexFilter(allDexes, { ...baseArgs, excludeDex: ["km", "abcd"] })).toEqual(["xyz", "flx"]);
  });

  it("applies include filter before exclude filter", () => {
    // include xyz and flx, then exclude flx → only xyz
    expect(applyDexFilter(allDexes, { ...baseArgs, dex: ["xyz", "flx"], excludeDex: ["flx"] })).toEqual(["xyz"]);
  });

  it("returns empty array when include filter matches nothing", () => {
    expect(applyDexFilter(allDexes, { ...baseArgs, dex: ["nonexistent"] })).toEqual([]);
  });

  it("returns empty array when all dexes are excluded", () => {
    expect(applyDexFilter(allDexes, { ...baseArgs, excludeDex: allDexes })).toEqual([]);
  });
});
