import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { LeaderboardTable } from '../components/LeaderboardTable.js'
import type { LeaderboardRow } from '../hooks/useSpreadMonitor.js'

function makeRow(overrides: Partial<LeaderboardRow> = {}): LeaderboardRow {
  return {
    coin: 'BTC',
    dex: 'HL',
    currentPct: 0.2,
    avgPct: 0.15,
    maxPct: 0.3,
    consistency: 0.9,
    samples: 10,
    dayNtlVlm: 1_200_000,
    ...overrides,
  }
}

describe('LeaderboardTable', () => {
  describe('headers', () => {
    it('renders all 10 column headers including DEX', () => {
      render(<LeaderboardTable rows={[]} />)
      expect(screen.getByText('#')).toBeInTheDocument()
      expect(screen.getByText('Asset')).toBeInTheDocument()
      expect(screen.getByText('DEX')).toBeInTheDocument()
      expect(screen.getByText('Current%')).toBeInTheDocument()
      expect(screen.getByText('Bps')).toBeInTheDocument()
      expect(screen.getByText('Avg%')).toBeInTheDocument()
      expect(screen.getByText('Max%')).toBeInTheDocument()
      expect(screen.getByText('Consistency')).toBeInTheDocument()
      expect(screen.getByText('Samples')).toBeInTheDocument()
      expect(screen.getByText('24h Vol')).toBeInTheDocument()
    })
  })

  describe('rows', () => {
    it('renders one table row per item', () => {
      const rows = [makeRow({ coin: 'BTC' }), makeRow({ coin: 'ETH' })]
      render(<LeaderboardTable rows={rows} />)
      const tbody = document.querySelector('tbody')!
      expect(within(tbody).getAllByRole('row')).toHaveLength(2)
    })

    it('renders rank numbers starting at 1', () => {
      const rows = [makeRow({ coin: 'BTC' }), makeRow({ coin: 'ETH' })]
      render(<LeaderboardTable rows={rows} />)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('renders coin name in Asset column', () => {
      render(<LeaderboardTable rows={[makeRow({ coin: 'SOL' })]} />)
      expect(screen.getByText('SOL')).toBeInTheDocument()
    })

    it('renders dex name in DEX column', () => {
      render(<LeaderboardTable rows={[makeRow({ dex: 'xyz' })]} />)
      expect(screen.getByText('xyz')).toBeInTheDocument()
    })

    it('renders "HL" for main exchange rows', () => {
      render(<LeaderboardTable rows={[makeRow({ dex: 'HL' })]} />)
      expect(screen.getByText('HL')).toBeInTheDocument()
    })

    it('renders currentPct formatted as percentage', () => {
      render(<LeaderboardTable rows={[makeRow({ currentPct: 0.2 })]} />)
      expect(screen.getByText('0.2000%')).toBeInTheDocument()
    })

    it('renders bps in Bps column', () => {
      render(<LeaderboardTable rows={[makeRow({ currentPct: 0.2 })]} />)
      expect(screen.getByText('20.0')).toBeInTheDocument()
    })

    it('renders avgPct formatted as percentage', () => {
      render(<LeaderboardTable rows={[makeRow({ avgPct: 0.15 })]} />)
      expect(screen.getByText('0.1500%')).toBeInTheDocument()
    })

    it('renders maxPct formatted as percentage', () => {
      render(<LeaderboardTable rows={[makeRow({ maxPct: 0.3 })]} />)
      expect(screen.getByText('0.3000%')).toBeInTheDocument()
    })

    it('renders consistency as integer percent string', () => {
      render(<LeaderboardTable rows={[makeRow({ consistency: 0.9 })]} />)
      expect(screen.getByText('90%')).toBeInTheDocument()
    })

    it('renders sample count', () => {
      render(<LeaderboardTable rows={[makeRow({ samples: 42 })]} />)
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('renders volume formatted when dayNtlVlm is defined', () => {
      render(<LeaderboardTable rows={[makeRow({ dayNtlVlm: 1_200_000 })]} />)
      expect(screen.getByText('$1.20M')).toBeInTheDocument()
    })

    it('renders "-" when dayNtlVlm is undefined', () => {
      render(<LeaderboardTable rows={[makeRow({ dayNtlVlm: undefined })]} />)
      expect(screen.getByText('-')).toBeInTheDocument()
    })

    it('renders empty tbody when rows is empty', () => {
      render(<LeaderboardTable rows={[]} />)
      const tbody = document.querySelector('tbody')!
      expect(within(tbody).queryAllByRole('row')).toHaveLength(0)
    })

    it('renders rows in the order provided', () => {
      const rows = [
        makeRow({ coin: 'AAA' }),
        makeRow({ coin: 'BBB' }),
        makeRow({ coin: 'CCC' }),
      ]
      render(<LeaderboardTable rows={rows} />)
      const cells = screen.getAllByText(/^(AAA|BBB|CCC)$/)
      expect(cells[0]).toHaveTextContent('AAA')
      expect(cells[1]).toHaveTextContent('BBB')
      expect(cells[2]).toHaveTextContent('CCC')
    })
  })
})
