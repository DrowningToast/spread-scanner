// Tickers verified against live perpDexs() + metaAndAssetCtxs() 2026-05-23:
//   xyz → SP500 | flx → USA500 | km → US500 | abcd → USA500 | cash → USA500
export const assetAliases: Record<string, string[]> = {
  "S&P500":      ["SP500", "USA500", "US500", "SPX"],
  "Nasdaq":      ["USA100", "USTECH", "XYZ100", "NAS100"],
  "Nikkei":      ["JP225", "JPN225"],
  "Russell":     ["SMALL2000", "US2000"],
  "Mag7":        ["MAG7"],
  "Semis":       ["SEMIS", "SEMI"],
  "US Energy":   ["USENERGY"],
  "US Bond":     ["USBOND"],
  "Gold":        ["GOLD", "GOLDJM"],
  "Silver":      ["SILVER", "SILVERJM"],
  "Oil":         ["USOIL", "OIL", "WTI", "BRENTOIL"],
  "Natural Gas": ["NATGAS", "GAS"],
  "VIX":         ["VIX"],
  "DXY":         ["DXY"],
  "Copper":      ["COPPER"],
  "Platinum":    ["PLATINUM"],
  "Palladium":   ["PALLADIUM"],
};

// Reverse lookup built once at module load
const tickerToCanonical = new Map<string, string>();
for (const [canonical, tickers] of Object.entries(assetAliases)) {
  for (const ticker of tickers) {
    tickerToCanonical.set(ticker.toUpperCase(), canonical);
  }
}

export function getCanonicalName(ticker: string): string {
  return tickerToCanonical.get(ticker.toUpperCase()) ?? ticker;
}
