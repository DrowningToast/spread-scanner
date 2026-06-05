import { useRef, useMemo, useEffect, useState } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { hlClient } from '../../client.js'
import { Hip3Service } from '../../services/hip3Service.js'

const INTERVAL_MS = 60_000
const WINDOW_SIZE = 60
const CONSISTENCY_THRESHOLD = 0.05

export interface LeaderboardRow {
  coin: string
  dex: string
  currentPct: number
  avgPct: number
  maxPct: number
  consistency: number
  samples: number
  dayNtlVlm: number | undefined
}

interface HistoryEntry {
  spreads: number[]
  coin: string
  dex: string
  dayNtlVlm: number
}

function computeRows(history: Map<string, HistoryEntry>): LeaderboardRow[] {
  return [...history.values()].map((entry) => {
    const { coin, spreads, dex, dayNtlVlm } = entry
    const currentPct = spreads.at(-1) ?? 0
    const avgPct = spreads.reduce((s, v) => s + v, 0) / spreads.length
    const maxPct = Math.max(...spreads)
    const consistency =
      spreads.filter((v) => v >= CONSISTENCY_THRESHOLD).length / spreads.length
    return { coin, dex, currentPct, avgPct, maxPct, consistency, samples: spreads.length, dayNtlVlm }
  })
}

export function useSpreadMonitor() {
  const hip3ServiceRef = useRef(new Hip3Service(hlClient))
  const historyRef = useRef(new Map<string, HistoryEntry>())
  const lastUpdatedRef = useRef(new Map<string, number>())
  const [partialRows, setPartialRows] = useState<LeaderboardRow[]>([])
  const [tick, setTick] = useState(0)

  // Step 1: fetch the DEX list once
  const {
    data: dexes,
    isPending: dexesPending,
    isError: dexesError,
    error: dexesErrorObj,
  } = useQuery({
    queryKey: ['hip3:dexes'],
    queryFn: () => hip3ServiceRef.current.getDexes(),
    staleTime: Infinity,
  })

  // Step 2: one query per DEX, parallel
  const dexResults = useQueries({
    queries: (dexes ?? []).map((dex) => ({
      queryKey: ['hip3:spreads', dex],
      queryFn: () => hip3ServiceRef.current.getHip3Spreads([dex]),
      refetchInterval: INTERVAL_MS,
      staleTime: Infinity,
    })),
  })

  const dexTimestamps = dexResults.map((r) => r.dataUpdatedAt ?? 0).join(',')

  // Step 3: update rolling history whenever any DEX query delivers new data
  useEffect(() => {
    if (!dexes) return
    let anyNew = false

    for (let i = 0; i < dexes.length; i++) {
      const result = dexResults[i]
      const dex = dexes[i]

      if (!result?.data || !result.dataUpdatedAt) continue
      const lastSeen = lastUpdatedRef.current.get(dex) ?? 0
      if (result.dataUpdatedAt <= lastSeen) continue

      lastUpdatedRef.current.set(dex, result.dataUpdatedAt)

      for (const group of result.data) {
        for (const market of group.markets) {
          if (market.dex !== dex) continue
          const key = `${dex}:${group.canonical}`
          const entry = historyRef.current.get(key) ?? {
            spreads: [],
            coin: group.canonical,
            dex,
            dayNtlVlm: 0,
          }
          entry.spreads.push(market.spreadPct)
          if (entry.spreads.length > WINDOW_SIZE) entry.spreads.shift()
          entry.coin = group.canonical
          entry.dayNtlVlm = market.dayNtlVlm
          historyRef.current.set(key, entry)
        }
      }

      anyNew = true
    }

    if (anyNew) {
      setPartialRows(computeRows(historyRef.current))
      setTick((t) => t + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dexTimestamps, dexes])

  const rows = useMemo(
    () => [...partialRows].sort((a, b) => b.avgPct - a.avgPct),
    [partialRows],
  )

  const isAnyDexPending = dexResults.some((r) => r.isPending)
  const isAllDexError = dexResults.length > 0 && dexResults.every((r) => r.isError)

  return {
    rows,
    tick,
    isLoading: partialRows.length === 0 && !dexesError && (dexesPending || isAnyDexPending),
    isError: dexesError || isAllDexError,
    error: dexesErrorObj ?? dexResults.find((r) => r.isError)?.error ?? undefined,
  }
}
