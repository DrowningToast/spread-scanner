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
    const url = new URL(`${BASE_URL}/perps/trades`)
    url.searchParams.set('market', params.market)
    if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit))
    if (params.cursor !== undefined) url.searchParams.set('cursor', params.cursor)

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json() as Promise<OndoTradesResponse>
  }

  async getDepth(market: string): Promise<OndoDepthResponse> {
    const url = new URL(`${BASE_URL}/perps/depth`)
    url.searchParams.set('market', market)
    url.searchParams.set('depth', '1')

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json() as Promise<OndoDepthResponse>
  }
}
