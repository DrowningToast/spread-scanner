import { describe, it, expect } from 'vitest'
import { pct, bps, vol, consistencyLabel } from '../utils/formatters.js'

describe('pct', () => {
  it('formats 0 as "0.0000%"', () => {
    expect(pct(0)).toBe('0.0000%')
  })
  it('formats 0.2 as "0.2000%"', () => {
    expect(pct(0.2)).toBe('0.2000%')
  })
  it('rounds to 4 decimal places', () => {
    expect(pct(0.123456789)).toBe('0.1235%')
  })
  it('formats a negative number with minus sign', () => {
    expect(pct(-0.5)).toBe('-0.5000%')
  })
  it('accepts custom decimal count', () => {
    expect(pct(0.2, 2)).toBe('0.20%')
  })
})

describe('bps', () => {
  it('converts 0.2% to "20.0" bps', () => {
    expect(bps(0.2)).toBe('20.0')
  })
  it('converts 0.05% to "5.0" bps', () => {
    expect(bps(0.05)).toBe('5.0')
  })
  it('converts 0.123% to "12.3" bps', () => {
    expect(bps(0.123)).toBe('12.3')
  })
  it('returns a string', () => {
    expect(typeof bps(0.1)).toBe('string')
  })
  it('converts 0 to "0.0"', () => {
    expect(bps(0)).toBe('0.0')
  })
})

describe('vol', () => {
  it('formats 0 as "$0"', () => {
    expect(vol(0)).toBe('$0')
  })
  it('formats 500 as "$500"', () => {
    expect(vol(500)).toBe('$500')
  })
  it('formats 1500 as "$1.5K"', () => {
    expect(vol(1500)).toBe('$1.5K')
  })
  it('formats 1_200_000 as "$1.20M"', () => {
    expect(vol(1_200_000)).toBe('$1.20M')
  })
  it('formats 2_500_000_000 as "$2.50B"', () => {
    expect(vol(2_500_000_000)).toBe('$2.50B')
  })
  it('formats exactly 1_000_000 as "$1.00M" (boundary)', () => {
    expect(vol(1_000_000)).toBe('$1.00M')
  })
  it('formats exactly 1_000_000_000 as "$1.00B" (boundary)', () => {
    expect(vol(1_000_000_000)).toBe('$1.00B')
  })
  it('formats 999 as "$999"', () => {
    expect(vol(999)).toBe('$999')
  })
  it('formats 1000 as "$1.0K"', () => {
    expect(vol(1000)).toBe('$1.0K')
  })
})

describe('consistencyLabel', () => {
  it('formats 1.0 as "100%"', () => {
    expect(consistencyLabel(1.0)).toBe('100%')
  })
  it('formats 0.5 as "50%"', () => {
    expect(consistencyLabel(0.5)).toBe('50%')
  })
  it('formats 0 as "0%"', () => {
    expect(consistencyLabel(0)).toBe('0%')
  })
  it('rounds to nearest integer percent', () => {
    expect(consistencyLabel(0.856)).toBe('86%')
  })
  it('formats 0.333 as "33%"', () => {
    expect(consistencyLabel(0.333)).toBe('33%')
  })
})
