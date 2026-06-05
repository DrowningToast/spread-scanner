import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'

vi.mock('../../services/ondoperpsService.js')

import { useOndoTrades } from '../hooks/useOndoTrades.js'
import { OndoperpsService } from '../../services/ondoperpsService.js'

const MockService = vi.mocked(OndoperpsService)
type GetTradesFn = typeof MockService.prototype.getTrades
const setTrades = (fn: GetTradesFn) => { MockService.prototype.getTrades = fn }

const makeTrade = (id = '1') => ({
  market: 'BTC-USD.P',
  price: '67500.00',
  size: '0.1',
  cost: '6750.00',
  aggressor_side: 'buy' as const,
  time: '2024-01-01T00:00:00Z',
  id,
})

const makeResponse = (trades = [makeTrade()], nextCursor?: string) => ({
  success: true,
  result: trades,
  pageInfo: { ...(nextCursor ? { nextCursor } : {}) },
})

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
  setTrades(vi.fn<GetTradesFn>().mockResolvedValue(makeResponse()))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useOndoTrades', () => {
  describe('initial state', () => {
    it('returns isPending true while fetch is in flight', () => {
      setTrades(vi.fn<GetTradesFn>(() => new Promise(() => {})))

      const { result } = renderHook(() => useOndoTrades('BTC-USD.P'), { wrapper: createWrapper() })

      expect(result.current.isPending).toBe(true)
    })

    it('returns empty trades array before first fetch completes', () => {
      setTrades(vi.fn<GetTradesFn>(() => new Promise(() => {})))

      const { result } = renderHook(() => useOndoTrades('BTC-USD.P'), { wrapper: createWrapper() })

      expect(result.current.trades).toEqual([])
    })
  })

  describe('success state', () => {
    it('returns trades after fetch completes', async () => {
      const trades = [makeTrade('a'), makeTrade('b')]
      setTrades(vi.fn<GetTradesFn>().mockResolvedValue(makeResponse(trades)))

      const { result } = renderHook(() => useOndoTrades('BTC-USD.P'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isPending).toBe(false))
      expect(result.current.trades).toHaveLength(2)
      expect(result.current.trades[0].id).toBe('a')
    })

    it('exposes nextCursor from pageInfo', async () => {
      setTrades(vi.fn<GetTradesFn>().mockResolvedValue(makeResponse([makeTrade()], 'CURSOR==')))

      const { result } = renderHook(() => useOndoTrades('BTC-USD.P'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isPending).toBe(false))
      expect(result.current.nextCursor).toBe('CURSOR==')
    })

    it('returns nextCursor as undefined when not present', async () => {
      const { result } = renderHook(() => useOndoTrades('BTC-USD.P'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isPending).toBe(false))
      expect(result.current.nextCursor).toBeUndefined()
    })

    it('passes market and limit to the service', async () => {
      const { result } = renderHook(() => useOndoTrades('AAPL-USD.P', 50), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isPending).toBe(false))
      expect(MockService.prototype.getTrades).toHaveBeenCalledWith({ market: 'AAPL-USD.P', limit: 50 })
    })
  })

  describe('error state', () => {
    it('returns isError true when fetch throws', async () => {
      setTrades(vi.fn<GetTradesFn>().mockRejectedValue(new Error('API down')))

      const { result } = renderHook(() => useOndoTrades('BTC-USD.P'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })

    it('exposes the error object', async () => {
      const err = new Error('rate limited')
      setTrades(vi.fn<GetTradesFn>().mockRejectedValue(err))

      const { result } = renderHook(() => useOndoTrades('BTC-USD.P'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBe(err)
    })
  })
})
