import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { OndoperpsService, type OndoTrade } from '../../services/ondoperpsService.js'

const REFETCH_INTERVAL_MS = 30_000

export function useOndoTrades(market: string, limit?: number) {
  const service = useRef(new OndoperpsService())

  const { isPending, isError, error, data } = useQuery({
    queryKey: ['ondoTrades', market, limit],
    queryFn: () => service.current.getTrades({ market, limit }),
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: Infinity,
  })

  return {
    trades: (data?.result ?? []) as OndoTrade[],
    nextCursor: data?.pageInfo.nextCursor,
    isPending,
    isError,
    error,
  }
}
