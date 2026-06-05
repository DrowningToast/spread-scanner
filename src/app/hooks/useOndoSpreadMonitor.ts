import { useRef, useMemo, useEffect, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { OndoperpsService } from '../../services/ondoperpsService.js'
import type { LeaderboardRow } from './useSpreadMonitor.js'

const INTERVAL_MS = 60_000
const WINDOW_SIZE = 60
const CONSISTENCY_THRESHOLD = 0.05

const EQUITY_MARKETS = [
  'AAPL-USD.P', 'AMD-USD.P', 'AMZN-USD.P', 'COIN-USD.P', 'CRCL-USD.P',
  'GOOGL-USD.P', 'HOOD-USD.P', 'INTC-USD.P', 'META-USD.P', 'MSFT-USD.P',
  'MSTR-USD.P', 'NFLX-USD.P', 'NVDA-USD.P', 'ORCL-USD.P', 'PLTR-USD.P',
  'TSLA-USD.P', 'US500-USD.P', 'US100-USD.P', 'XAU-USD.P', 'XAG-USD.P',
  'WTI-USD.P', 'DRAM-USD.P',
]

interface HistoryEntry {
  coin: string
  dex: string
  spreads: number[]
}

function computeRows(history: Map<string, HistoryEntry>): LeaderboardRow[] {
  return [...history.values()].map((entry) => {
    const { coin, dex, spreads } = entry
    const currentPct = spreads.at(-1) ?? 0
    const avgPct = spreads.reduce((s, v) => s + v, 0) / spreads.length
    const maxPct = Math.max(...spreads)
    const consistency =
      spreads.filter((v) => v >= CONSISTENCY_THRESHOLD).length / spreads.length
    return { coin, dex, currentPct, avgPct, maxPct, consistency, samples: spreads.length, dayNtlVlm: undefined }
  })
}

const ondoService = new OndoperpsService()

export function useOndoSpreadMonitor() {
  const historyRef = useRef(new Map<string, HistoryEntry>())
  const lastUpdatedRef = useRef(new Map<string, number>())
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [tick, setTick] = useState(0)

  const results = useQueries({
    queries: EQUITY_MARKETS.map((market) => ({
      queryKey: ['ondo:depth', market],
      queryFn: () => ondoService.getDepth(market),
      refetchInterval: INTERVAL_MS,
      staleTime: Infinity,
    })),
  })

  const dataTimestamps = results.map((r) => r.dataUpdatedAt ?? 0).join(',')

  useEffect(() => {
    let anyNew = false

    for (let i = 0; i < EQUITY_MARKETS.length; i++) {
      const query = results[i]
      const market = EQUITY_MARKETS[i]

      if (!query?.data || !query.dataUpdatedAt) continue
      const lastSeen = lastUpdatedRef.current.get(market) ?? 0
      if (query.dataUpdatedAt <= lastSeen) continue

      lastUpdatedRef.current.set(market, query.dataUpdatedAt)

      const result = query.data.result
      if (!result.bids.length || !result.asks.length) continue

      const bid = parseFloat(result.bids[0][0])
      const ask = parseFloat(result.asks[0][0])
      if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) continue

      const mid = (bid + ask) / 2
      const spreadPct = ((ask - bid) / mid) * 100
      const coin = market.replace('-USD.P', '')

      const entry = historyRef.current.get(market) ?? { coin, dex: 'ondoperps', spreads: [] }
      entry.spreads.push(spreadPct)
      if (entry.spreads.length > WINDOW_SIZE) entry.spreads.shift()
      historyRef.current.set(market, entry)

      anyNew = true
    }

    if (anyNew) {
      setRows(computeRows(historyRef.current))
      setTick((t) => t + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataTimestamps])

  const isLoading = results.some((r) => r.isPending) && rows.length === 0
  const isError = results.length > 0 && results.every((r) => r.isError)
  const error = results.find((r) => r.isError)?.error

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.avgPct - a.avgPct),
    [rows],
  )

  return { rows: sortedRows, tick, isLoading, isError, error }
}
