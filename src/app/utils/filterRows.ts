import { assetAliases } from '../../config/aliases.js'
import type { LeaderboardRow } from '../hooks/useSpreadMonitor.js'

// Reverse map: TICKER → canonical (built once at module load)
const tickerToCanonical = new Map<string, string>()
for (const [canonical, tickers] of Object.entries(assetAliases)) {
  for (const t of tickers) tickerToCanonical.set(t.toUpperCase(), canonical)
}

export interface FilterState {
  dexFilter: Set<string>
  assetQuery: string
}

export function filterRows(rows: LeaderboardRow[], filter: FilterState): LeaderboardRow[] {
  const { dexFilter, assetQuery } = filter
  const q = assetQuery.trim().toUpperCase()

  return rows.filter((row) => {
    if (dexFilter.size > 0 && !dexFilter.has(row.dex)) return false

    if (q) {
      const canonicalMatch = row.coin.toUpperCase().includes(q)
      const aliasMatch = tickerToCanonical.get(q) === row.coin
      if (!canonicalMatch && !aliasMatch) return false
    }

    return true
  })
}
