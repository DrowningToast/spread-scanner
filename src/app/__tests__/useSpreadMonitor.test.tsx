import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'

vi.mock('../../client.js', () => ({ hlClient: {} }))
vi.mock('../../services/hip3Service.js')

import { useSpreadMonitor } from '../hooks/useSpreadMonitor.js'
import { Hip3Service } from '../../services/hip3Service.js'

const MockHip3Service = vi.mocked(Hip3Service)

type GetDexesFn = typeof MockHip3Service.prototype.getDexes
type GetSpreadsFn = typeof MockHip3Service.prototype.getHip3Spreads

const setDexes = (fn: GetDexesFn) => { MockHip3Service.prototype.getDexes = fn }
const setSpreads = (fn: GetSpreadsFn) => { MockHip3Service.prototype.getHip3Spreads = fn }

function makeHip3Group(canonical: string, markets: Array<{ dex: string; spreadPct: number; dayNtlVlm?: number }>) {
  return {
    canonical,
    markets: markets.map(({ dex, spreadPct, dayNtlVlm = 500_000 }) => ({
      dex, ticker: canonical, canonical,
      bid: 100, ask: 100 + spreadPct, mid: 100 + spreadPct / 2,
      spreadPct, dayNtlVlm,
    })),
  }
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  setDexes(vi.fn<GetDexesFn>().mockResolvedValue([]))
  setSpreads(vi.fn<GetSpreadsFn>().mockResolvedValue([]))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useSpreadMonitor', () => {
  describe('initial state', () => {
    it('returns isLoading true while DEX list is pending', () => {
      setDexes(vi.fn<GetDexesFn>(() => new Promise(() => {})))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(true)
    })

    it('returns rows as empty array before first fetch completes', () => {
      setDexes(vi.fn<GetDexesFn>(() => new Promise(() => {})))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      expect(result.current.rows).toEqual([])
    })

    it('returns tick 0 before first fetch completes', () => {
      setDexes(vi.fn<GetDexesFn>(() => new Promise(() => {})))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      expect(result.current.tick).toBe(0)
    })
  })

  describe('progressive loading', () => {
    it('shows rows for a resolved DEX while another DEX is still loading', async () => {
      setDexes(vi.fn<GetDexesFn>().mockResolvedValue(['fast', 'slow']))
      setSpreads(vi.fn<GetSpreadsFn>((dexes) => {
        if (dexes[0] === 'fast') {
          return Promise.resolve([makeHip3Group('Gold', [{ dex: 'fast', spreadPct: 0.3 }])])
        }
        return new Promise(() => {}) // 'slow' never resolves
      }))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() =>
        expect(result.current.rows.some((r) => r.coin === 'Gold' && r.dex === 'fast')).toBe(true),
      )
      expect(result.current.isLoading).toBe(false)
    })

    it('returns isLoading false once at least one DEX data arrives', async () => {
      setDexes(vi.fn<GetDexesFn>().mockResolvedValue(['dexA']))
      setSpreads(vi.fn<GetSpreadsFn>().mockResolvedValue(
        [makeHip3Group('Gold', [{ dex: 'dexA', spreadPct: 0.3 }])],
      ))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
  })

  describe('HIP-3 rows', () => {
    it('shows one row per DEX+asset combination', async () => {
      setDexes(vi.fn<GetDexesFn>().mockResolvedValue(['dexA', 'dexB']))
      setSpreads(vi.fn<GetSpreadsFn>((dexes) => {
        const dex = dexes[0]
        return Promise.resolve([makeHip3Group('S&P500', [{ dex, spreadPct: dex === 'dexA' ? 0.5 : 0.3 }])])
      }))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.rows.length).toBe(2))
      const dexes = result.current.rows.map((r) => r.dex)
      expect(dexes).toContain('dexA')
      expect(dexes).toContain('dexB')
    })

    it('all rows for same asset share the same coin name', async () => {
      setDexes(vi.fn<GetDexesFn>().mockResolvedValue(['dexA', 'dexB']))
      setSpreads(vi.fn<GetSpreadsFn>((dexes) => {
        const dex = dexes[0]
        return Promise.resolve([makeHip3Group('Gold', [{ dex, spreadPct: 0.3 }])])
      }))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.rows.length).toBe(2))
      expect(result.current.rows.every((r) => r.coin === 'Gold')).toBe(true)
    })

    it('includes a low-spread DEX alongside a high-spread DEX for the same asset', async () => {
      setDexes(vi.fn<GetDexesFn>().mockResolvedValue(['cash', 'xyz']))
      setSpreads(vi.fn<GetSpreadsFn>((dexes) => {
        const dex = dexes[0]
        const spread = dex === 'cash' ? 0.1 : 0.8
        return Promise.resolve([makeHip3Group('S&P500', [{ dex, spreadPct: spread }])])
      }))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.rows.length).toBe(2))
      const dexes = result.current.rows.map((r) => r.dex)
      expect(dexes).toContain('cash')
      expect(dexes).toContain('xyz')
    })

    it('sorts rows by avgPct descending', async () => {
      setDexes(vi.fn<GetDexesFn>().mockResolvedValue(['dexA']))
      setSpreads(vi.fn<GetSpreadsFn>().mockResolvedValue([
        makeHip3Group('Gold', [{ dex: 'dexA', spreadPct: 0.2 }]),
        makeHip3Group('Oil', [{ dex: 'dexA', spreadPct: 0.8 }]),
      ]))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.rows.length).toBe(2))
      expect(result.current.rows[0].coin).toBe('Oil')
      expect(result.current.rows[1].coin).toBe('Gold')
    })

    it('computes currentPct, avgPct, maxPct, consistency correctly', async () => {
      setDexes(vi.fn<GetDexesFn>().mockResolvedValue(['dexA']))
      setSpreads(vi.fn<GetSpreadsFn>().mockResolvedValue(
        [makeHip3Group('Gold', [{ dex: 'dexA', spreadPct: 0.25 }])],
      ))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.rows.length).toBe(1))
      const row = result.current.rows[0]
      expect(row.currentPct).toBeCloseTo(0.25)
      expect(row.avgPct).toBeCloseTo(0.25)
      expect(row.maxPct).toBeCloseTo(0.25)
      expect(row.consistency).toBeCloseTo(1.0)
    })

    it('increments tick after each DEX list fetch', async () => {
      setDexes(vi.fn<GetDexesFn>().mockResolvedValue(['dexA']))
      setSpreads(vi.fn<GetSpreadsFn>().mockResolvedValue(
        [makeHip3Group('Gold', [{ dex: 'dexA', spreadPct: 0.3 }])],
      ))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.tick).toBe(1))
    })

    it('stores dayNtlVlm per DEX market', async () => {
      setDexes(vi.fn<GetDexesFn>().mockResolvedValue(['dexA']))
      setSpreads(vi.fn<GetSpreadsFn>().mockResolvedValue([
        makeHip3Group('Gold', [{ dex: 'dexA', spreadPct: 0.3, dayNtlVlm: 300_000 }]),
      ]))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.rows.length).toBe(1))
      expect(result.current.rows[0].dayNtlVlm).toBe(300_000)
    })

    it('returns all rows without slicing (slicing is the component\'s responsibility)', async () => {
      const groups = Array.from({ length: 40 }, (_, i) =>
        makeHip3Group(`ASSET${i}`, [{ dex: 'dexA', spreadPct: i * 0.01 }]),
      )
      setDexes(vi.fn<GetDexesFn>().mockResolvedValue(['dexA']))
      setSpreads(vi.fn<GetSpreadsFn>().mockResolvedValue(groups))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.rows.length).toBe(40))
    })
  })

  describe('error state', () => {
    it('returns isError true when getDexes throws', async () => {
      setDexes(vi.fn<GetDexesFn>().mockRejectedValue(new Error('network error')))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })

    it('returns the error object', async () => {
      const err = new Error('API down')
      setDexes(vi.fn<GetDexesFn>().mockRejectedValue(err))

      const { result } = renderHook(() => useSpreadMonitor(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBe(err)
    })
  })
})
