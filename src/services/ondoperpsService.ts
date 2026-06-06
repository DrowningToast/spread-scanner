const BASE_URL = '/api/ondo'

export interface OndoTrade {
  market: string
  price: string
  size: string
  cost: string
  aggressor_side: 'buy' | 'sell'
  time: string
  id: string
}

export interface OndoTradesResponse {
  success: boolean
  result: OndoTrade[]
  pageInfo: {
    prevCursor?: string
    nextCursor?: string
  }
}

export interface GetTradesParams {
  market: string
  limit?: number
  cursor?: string
}

export interface OndoDepthResponse {
  success: boolean
  result: {
    market: string
    time: string
    bids: [string, string][]
    asks: [string, string][]
  }
}

export class OndoperpsService {
  async getTrades(params: GetTradesParams): Promise<OndoTradesResponse> {
    const qs = new URLSearchParams({ market: params.market })
    if (params.limit !== undefined) qs.set('limit', String(params.limit))
    if (params.cursor !== undefined) qs.set('cursor', params.cursor)

    const response = await fetch(`${BASE_URL}/perps/trades?${qs.toString()}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json() as Promise<OndoTradesResponse>
  }

  async getDepth(market: string): Promise<OndoDepthResponse> {
    const qs = new URLSearchParams({ market, depth: '1' })

    const response = await fetch(`${BASE_URL}/perps/depth?${qs.toString()}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json() as Promise<OndoDepthResponse>
  }
}
