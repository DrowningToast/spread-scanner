import { useState, useMemo } from 'react'
import { pct, bps, vol, consistencyLabel } from '../utils/formatters.js'
import type { LeaderboardRow } from '../hooks/useSpreadMonitor.js'

const consistencyClass = (n: number) =>
  n >= 0.8 ? 'text-green-400' : n >= 0.5 ? 'text-yellow-400' : 'text-red-400'

type SortKey = keyof LeaderboardRow | 'rank'
type SortDir = 'asc' | 'desc'

interface Props {
  rows: LeaderboardRow[]
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 opacity-30">↕</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

export function LeaderboardTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('currentPct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    if (sortKey === 'rank') return [...rows]
    return [...rows].sort((a, b) => {
      const av = a[sortKey as keyof LeaderboardRow] ?? -Infinity
      const bv = b[sortKey as keyof LeaderboardRow] ?? -Infinity
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [rows, sortKey, sortDir])

  function th(label: string, key: SortKey, align: 'left' | 'right' = 'right', extra = '') {
    return (
      <th
        className={`px-3 py-2 text-${align} cursor-pointer select-none hover:text-gray-200 transition-colors ${extra}`}
        onClick={() => handleSort(key)}
      >
        {label}<SortIcon active={sortKey === key} dir={sortDir} />
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full text-sm font-mono border-collapse">
        <thead className="bg-gray-800 border-b border-gray-700">
          <tr className="text-gray-400 text-xs uppercase tracking-wider">
            {th('#', 'rank', 'right', 'w-8')}
            {th('Asset', 'coin', 'left')}
            {th('DEX', 'dex', 'left')}
            {th('Current%', 'currentPct')}
            {th('Bps', 'currentPct')}
            {th('Avg%', 'avgPct')}
            {th('Max%', 'maxPct')}
            {th('Consistency', 'consistency')}
            {th('Samples', 'samples')}
            {th('24h Vol', 'dayNtlVlm')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={`${row.dex}:${row.coin}`}
              className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
            >
              <td className="px-3 py-1.5 text-right text-gray-500">{i + 1}</td>
              <td className="px-3 py-1.5 text-left text-cyan-400 font-semibold">{row.coin}</td>
              <td className="px-3 py-1.5 text-left text-gray-500 text-xs">{row.dex}</td>
              <td className="px-3 py-1.5 text-right text-yellow-400">{pct(row.currentPct)}</td>
              <td className="px-3 py-1.5 text-right text-yellow-400">{bps(row.currentPct)}</td>
              <td className="px-3 py-1.5 text-right text-gray-200">{pct(row.avgPct)}</td>
              <td className="px-3 py-1.5 text-right text-gray-300">{pct(row.maxPct)}</td>
              <td className={`px-3 py-1.5 text-right ${consistencyClass(row.consistency)}`}>
                {consistencyLabel(row.consistency)}
              </td>
              <td className="px-3 py-1.5 text-right text-gray-500">{row.samples}</td>
              <td className="px-3 py-1.5 text-right text-gray-400">
                {row.dayNtlVlm != null ? vol(row.dayNtlVlm) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
