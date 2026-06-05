import { useState, useMemo } from 'react'
import { useSpreadMonitor } from '../hooks/useSpreadMonitor.js'
import { LeaderboardTable } from './LeaderboardTable.js'
import { FilterBar } from './FilterBar.js'
import { filterRows } from '../utils/filterRows.js'

const TOP_N = 30

export function SpreadMonitor() {
  const { rows, tick, isLoading, isError, error } = useSpreadMonitor()

  const [dexFilter, setDexFilter] = useState<Set<string>>(new Set())
  const [assetQuery, setAssetQuery] = useState('')

  const availableDexes = useMemo(
    () => [...new Set(rows.map((r) => r.dex))].sort(),
    [rows],
  )

  const filteredRows = useMemo(
    () => filterRows(rows, { dexFilter, assetQuery }).slice(0, TOP_N),
    [rows, dexFilter, assetQuery],
  )

  const handleDexToggle = (dex: string) => {
    setDexFilter((prev) => {
      const next = new Set(prev)
      next.has(dex) ? next.delete(dex) : next.add(dex)
      return next
    })
  }

  const handleClear = () => {
    setDexFilter(new Set())
    setAssetQuery('')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white tracking-tight font-mono">
          Spread Monitor
        </h1>
        <span className="text-xs text-gray-500 font-mono">
          Tick #{tick} &nbsp;·&nbsp; 60 min window &nbsp;·&nbsp; auto-refresh: 60s
        </span>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-gray-400 font-mono animate-pulse">
          Loading markets…
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-red-400 font-mono">
          Error: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <FilterBar
            availableDexes={availableDexes}
            dexFilter={dexFilter}
            assetQuery={assetQuery}
            onDexToggle={handleDexToggle}
            onAssetQueryChange={setAssetQuery}
            onClear={handleClear}
          />
          <LeaderboardTable rows={filteredRows} />
        </>
      )}
    </div>
  )
}
