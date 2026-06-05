export const pct = (n: number, d = 4): string => `${n.toFixed(d)}%`

export const bps = (n: number): string => `${(n * 100).toFixed(1)}`

export const vol = (n: number): string => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export const consistencyLabel = (n: number): string => `${Math.round(n * 100)}%`
