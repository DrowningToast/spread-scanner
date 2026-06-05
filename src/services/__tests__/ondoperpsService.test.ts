import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OndoperpsService } from '../ondoperpsService.js'

interface TradeOverrides { market?: string; price?: string; size?: string; cost?: string; aggressor_side?: 'buy' | 'sell'; time?: string; id?: string }
const makeTrade = (overrides: TradeOverrides = {}) => ({
  market: 'BTC-USD.P',
  price: '67500.00',
  size: '0.1',
  cost: '6750.00',
  aggressor_side: 'buy' as const,
  time: '2024-01-01T00:00:00Z',
  id: 'abc123',
  ...overrides,
})

const makeResponse = (trades = [makeTrade()], nextCursor?: string) => ({
  success: true,
  result: trades,
  pageInfo: { ...(nextCursor ? { nextCursor } : {}) },
})

describe('OndoperpsService', () => {
  let service: OndoperpsService
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    service = new OndoperpsService()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('getTrades', () => {
    it('calls the correct endpoint with the required market param', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(makeResponse()) })

      await service.getTrades({ market: 'BTC-USD.P' })

      expect(fetchMock).toHaveBeenCalledOnce()
      const url = new URL(fetchMock.mock.calls[0][0] as string)
      expect(url.origin + url.pathname).toBe('https://api.ondoperps.xyz/v1/perps/trades')
      expect(url.searchParams.get('market')).toBe('BTC-USD.P')
    })

    it('appends limit param when provided', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(makeResponse()) })

      await service.getTrades({ market: 'AAPL-USD.P', limit: 50 })

      const url = new URL(fetchMock.mock.calls[0][0] as string)
      expect(url.searchParams.get('limit')).toBe('50')
    })

    it('appends cursor param when provided', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(makeResponse()) })

      await service.getTrades({ market: 'AAPL-USD.P', cursor: 'NQ5WWO3THN3Q====' })

      const url = new URL(fetchMock.mock.calls[0][0] as string)
      expect(url.searchParams.get('cursor')).toBe('NQ5WWO3THN3Q====')
    })

    it('does not append limit or cursor when not provided', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(makeResponse()) })

      await service.getTrades({ market: 'BTC-USD.P' })

      const url = new URL(fetchMock.mock.calls[0][0] as string)
      expect(url.searchParams.has('limit')).toBe(false)
      expect(url.searchParams.has('cursor')).toBe(false)
    })

    it('returns the parsed response on success', async () => {
      const trades = [makeTrade({ price: '100.00' }), makeTrade({ price: '101.00', id: 'xyz' })]
      fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(makeResponse(trades, 'NEXTCURSOR==')) })

      const result = await service.getTrades({ market: 'BTC-USD.P' })

      expect(result.success).toBe(true)
      expect(result.result).toHaveLength(2)
      expect(result.result[0].price).toBe('100.00')
      expect(result.result[1].id).toBe('xyz')
      expect(result.pageInfo.nextCursor).toBe('NEXTCURSOR==')
    })

    it('throws on HTTP error response', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 429 })

      await expect(service.getTrades({ market: 'BTC-USD.P' })).rejects.toThrow('HTTP 429')
    })

    it('throws when fetch itself rejects (network error)', async () => {
      fetchMock.mockRejectedValue(new Error('network failure'))

      await expect(service.getTrades({ market: 'BTC-USD.P' })).rejects.toThrow('network failure')
    })
  })
})
