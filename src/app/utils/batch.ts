export async function runBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  size: number,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.all(items.slice(i, i + size).map(fn))
    results.push(...batch)
  }
  return results
}
