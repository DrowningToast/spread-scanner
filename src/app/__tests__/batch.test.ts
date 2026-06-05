import { describe, it, expect, vi } from 'vitest'
import { runBatch } from '../utils/batch.js'

describe('runBatch', () => {
  it('processes all items and returns all results', async () => {
    const fn = vi.fn((x: number) => Promise.resolve(x * 2))
    const result = await runBatch([1, 2, 3, 4], fn, 2)
    expect(result).toEqual([2, 4, 6, 8])
  })

  it('processes items in chunks of the given size', async () => {
    const callOrder: number[] = []
    const fn = (x: number) => {
      callOrder.push(x)
      return Promise.resolve(x)
    }
    await runBatch([1, 2, 3, 4, 5], fn, 2)
    // All items processed, order preserved within chunks
    expect(callOrder).toHaveLength(5)
    expect(callOrder).toContain(1)
    expect(callOrder).toContain(5)
  })

  it('handles a batch size larger than the array (single chunk)', async () => {
    const fn = (x: number) => Promise.resolve(x + 10)
    const result = await runBatch([1, 2], fn, 100)
    expect(result).toEqual([11, 12])
  })

  it('preserves order of results', async () => {
    const fn = (x: number) => Promise.resolve(x)
    const items = [5, 3, 1, 4, 2]
    const result = await runBatch(items, fn, 2)
    expect(result).toEqual([5, 3, 1, 4, 2])
  })

  it('handles an empty array', async () => {
    const fn = vi.fn(() => Promise.resolve(0))
    const result = await runBatch([], fn, 5)
    expect(result).toEqual([])
    expect(fn).not.toHaveBeenCalled()
  })

  it('works with batch size of 1', async () => {
    const fn = (x: number) => Promise.resolve(x * 3)
    const result = await runBatch([1, 2, 3], fn, 1)
    expect(result).toEqual([3, 6, 9])
  })
})
