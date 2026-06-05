import { describe, it, expect } from 'vitest'
import { filterRows } from '../utils/filterRows.js'
import type { LeaderboardRow } from '../hooks/useSpreadMonitor.js'

function makeRow(coin: string, dex: string): LeaderboardRow {
  return { coin, dex, currentPct: 0.1, avgPct: 0.1, maxPct: 0.2, consistency: 0.8, samples: 5, dayNtlVlm: 1_000_000 }
}

const rows = [
  makeRow('BTC', 'HL'),
  makeRow('ETH', 'HL'),
  makeRow('S&P500', 'xyz'),
  makeRow('Gold', 'flx'),
  makeRow('Nasdaq', 'km'),
]

describe('filterRows — DEX filter', () => {
  it('returns all rows when dexFilter is empty', () => {
    expect(filterRows(rows, { dexFilter: new Set(), assetQuery: '' })).toHaveLength(5)
  })

  it('returns only rows matching the selected DEX', () => {
    const result = filterRows(rows, { dexFilter: new Set(['HL']), assetQuery: '' })
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.dex === 'HL')).toBe(true)
  })

  it('supports multiple selected DEXes', () => {
    const result = filterRows(rows, { dexFilter: new Set(['HL', 'xyz']), assetQuery: '' })
    expect(result).toHaveLength(3)
  })

  it('returns empty array when no rows match selected DEX', () => {
    const result = filterRows(rows, { dexFilter: new Set(['nonexistent']), assetQuery: '' })
    expect(result).toHaveLength(0)
  })
})

describe('filterRows — asset query filter', () => {
  it('returns all rows when assetQuery is empty', () => {
    expect(filterRows(rows, { dexFilter: new Set(), assetQuery: '' })).toHaveLength(5)
  })

  it('matches canonical name exactly (case-insensitive)', () => {
    const result = filterRows(rows, { dexFilter: new Set(), assetQuery: 'gold' })
    expect(result).toHaveLength(1)
    expect(result[0].coin).toBe('Gold')
  })

  it('matches canonical name partially (case-insensitive)', () => {
    const result = filterRows(rows, { dexFilter: new Set(), assetQuery: 'nas' })
    expect(result).toHaveLength(1)
    expect(result[0].coin).toBe('Nasdaq')
  })

  it('matches ticker alias exactly — SP500 → S&P500', () => {
    const result = filterRows(rows, { dexFilter: new Set(), assetQuery: 'SP500' })
    expect(result).toHaveLength(1)
    expect(result[0].coin).toBe('S&P500')
  })

  it('matches ticker alias case-insensitively — sp500 → S&P500', () => {
    const result = filterRows(rows, { dexFilter: new Set(), assetQuery: 'sp500' })
    expect(result).toHaveLength(1)
    expect(result[0].coin).toBe('S&P500')
  })

  it('matches alternate ticker alias — USA500 → S&P500', () => {
    const result = filterRows(rows, { dexFilter: new Set(), assetQuery: 'USA500' })
    expect(result).toHaveLength(1)
    expect(result[0].coin).toBe('S&P500')
  })

  it('matches ticker alias — GOLD → Gold', () => {
    const result = filterRows(rows, { dexFilter: new Set(), assetQuery: 'GOLD' })
    expect(result).toHaveLength(1)
    expect(result[0].coin).toBe('Gold')
  })

  it('returns empty array when nothing matches', () => {
    const result = filterRows(rows, { dexFilter: new Set(), assetQuery: 'zzz' })
    expect(result).toHaveLength(0)
  })

  it('ignores leading/trailing whitespace in query', () => {
    const result = filterRows(rows, { dexFilter: new Set(), assetQuery: '  btc  ' })
    expect(result).toHaveLength(1)
    expect(result[0].coin).toBe('BTC')
  })
})

describe('filterRows — combined filters', () => {
  it('applies DEX and asset filters together (AND logic)', () => {
    const result = filterRows(rows, { dexFilter: new Set(['HL']), assetQuery: 'btc' })
    expect(result).toHaveLength(1)
    expect(result[0].coin).toBe('BTC')
    expect(result[0].dex).toBe('HL')
  })

  it('returns empty when asset matches but DEX does not', () => {
    const result = filterRows(rows, { dexFilter: new Set(['xyz']), assetQuery: 'btc' })
    expect(result).toHaveLength(0)
  })

  it('returns empty when DEX matches but asset does not', () => {
    const result = filterRows(rows, { dexFilter: new Set(['HL']), assetQuery: 'gold' })
    expect(result).toHaveLength(0)
  })
})
