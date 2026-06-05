import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../hooks/useSpreadMonitor.js', () => ({
  useSpreadMonitor: vi.fn(),
}))

import { SpreadMonitor } from '../components/SpreadMonitor.js'
import { useSpreadMonitor } from '../hooks/useSpreadMonitor.js'

const mockUseSpreadMonitor = vi.mocked(useSpreadMonitor)

function makeRow(coin: string, dex = 'HL') {
  return {
    coin,
    dex,
    currentPct: 0.2,
    avgPct: 0.15,
    maxPct: 0.3,
    consistency: 0.9,
    samples: 5,
    dayNtlVlm: 1_000_000,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SpreadMonitor', () => {
  describe('loading state', () => {
    beforeEach(() => {
      mockUseSpreadMonitor.mockReturnValue({
        rows: [],
        tick: 0,
        isLoading: true,
        isError: false,
        error: undefined,
      })
    })

    it('shows loading message', () => {
      render(<SpreadMonitor />)
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('does not render the table when loading', () => {
      render(<SpreadMonitor />)
      expect(document.querySelector('table')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    beforeEach(() => {
      mockUseSpreadMonitor.mockReturnValue({
        rows: [],
        tick: 0,
        isLoading: false,
        isError: true,
        error: new Error('API failed'),
      })
    })

    it('shows error message', () => {
      render(<SpreadMonitor />)
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })

    it('includes the error message text', () => {
      render(<SpreadMonitor />)
      expect(screen.getByText(/API failed/)).toBeInTheDocument()
    })

    it('does not render the table when error', () => {
      render(<SpreadMonitor />)
      expect(document.querySelector('table')).not.toBeInTheDocument()
    })
  })

  describe('data state', () => {
    beforeEach(() => {
      mockUseSpreadMonitor.mockReturnValue({
        rows: [makeRow('BTC'), makeRow('ETH')],
        tick: 3,
        isLoading: false,
        isError: false,
        error: undefined,
      })
    })

    it('renders the table when rows are present', () => {
      render(<SpreadMonitor />)
      expect(document.querySelector('table')).toBeInTheDocument()
    })

    it('displays tick number in the header', () => {
      render(<SpreadMonitor />)
      expect(screen.getByText(/tick\s*#\s*3/i)).toBeInTheDocument()
    })

    it('shows 60 min window label', () => {
      render(<SpreadMonitor />)
      expect(screen.getByText(/60\s*min/i)).toBeInTheDocument()
    })

    it('shows 60s refresh interval label', () => {
      render(<SpreadMonitor />)
      expect(screen.getByText(/60s/i)).toBeInTheDocument()
    })

    it('shows coin names from rows', () => {
      render(<SpreadMonitor />)
      expect(screen.getByText('BTC')).toBeInTheDocument()
      expect(screen.getByText('ETH')).toBeInTheDocument()
    })
  })

  describe('filter bar integration', () => {
    beforeEach(() => {
      mockUseSpreadMonitor.mockReturnValue({
        rows: [makeRow('BTC', 'HL'), makeRow('ETH', 'HL'), makeRow('S&P500', 'xyz')],
        tick: 1,
        isLoading: false,
        isError: false,
        error: undefined,
      })
    })

    it('renders the FilterBar when data is loaded', () => {
      render(<SpreadMonitor />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('shows all rows before any filter is applied', () => {
      render(<SpreadMonitor />)
      expect(screen.getByText('BTC')).toBeInTheDocument()
      expect(screen.getByText('ETH')).toBeInTheDocument()
      expect(screen.getByText('S&P500')).toBeInTheDocument()
    })

    it('filters rows by DEX when a DEX toggle is clicked', async () => {
      render(<SpreadMonitor />)
      await userEvent.click(screen.getByRole('button', { name: 'xyz' }))
      expect(screen.queryByText('BTC')).not.toBeInTheDocument()
      expect(screen.queryByText('ETH')).not.toBeInTheDocument()
      expect(screen.getByText('S&P500')).toBeInTheDocument()
    })

    it('filters rows by asset query typed in the search input', async () => {
      render(<SpreadMonitor />)
      await userEvent.type(screen.getByRole('textbox'), 'btc')
      expect(screen.getByText('BTC')).toBeInTheDocument()
      expect(screen.queryByText('ETH')).not.toBeInTheDocument()
      expect(screen.queryByText('S&P500')).not.toBeInTheDocument()
    })

    it('filters by ticker alias — typing SP500 shows S&P500', async () => {
      render(<SpreadMonitor />)
      await userEvent.type(screen.getByRole('textbox'), 'SP500')
      expect(screen.queryByText('BTC')).not.toBeInTheDocument()
      expect(screen.getByText('S&P500')).toBeInTheDocument()
    })

    it('restores all rows after clicking Clear', async () => {
      render(<SpreadMonitor />)
      await userEvent.type(screen.getByRole('textbox'), 'btc')
      expect(screen.queryByText('ETH')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /clear/i }))
      expect(screen.getByText('BTC')).toBeInTheDocument()
      expect(screen.getByText('ETH')).toBeInTheDocument()
      expect(screen.getByText('S&P500')).toBeInTheDocument()
    })
  })

  describe('TOP_N slicing and DEX visibility', () => {
    it('DEX filter includes DEXes from rows beyond position 30', () => {
      // 30 high-spread HL rows + 1 low-spread cash row = 31 total
      // cash must still appear as a filter option even though it won't be in the table
      const rows = [
        ...Array.from({ length: 30 }, (_, i) => makeRow(`COIN${i}`, 'HL')),
        makeRow('CashAsset', 'cash'),
      ]
      mockUseSpreadMonitor.mockReturnValue({ rows, tick: 1, isLoading: false, isError: false, error: undefined })

      render(<SpreadMonitor />)

      expect(screen.getByRole('button', { name: 'cash' })).toBeInTheDocument()
    })

    it('table shows at most 30 rows even when the hook returns more', () => {
      const rows = Array.from({ length: 35 }, (_, i) => makeRow(`COIN${i}`, 'HL'))
      mockUseSpreadMonitor.mockReturnValue({ rows, tick: 1, isLoading: false, isError: false, error: undefined })

      render(<SpreadMonitor />)

      expect(document.querySelectorAll('tbody tr').length).toBeLessThanOrEqual(30)
    })
  })

  describe('header', () => {
    beforeEach(() => {
      mockUseSpreadMonitor.mockReturnValue({
        rows: [],
        tick: 0,
        isLoading: false,
        isError: false,
        error: undefined,
      })
    })

    it('renders "Spread Monitor" title', () => {
      render(<SpreadMonitor />)
      expect(screen.getByText(/spread monitor/i)).toBeInTheDocument()
    })

    it('renders the title regardless of data state', () => {
      render(<SpreadMonitor />)
      expect(screen.getByRole('heading', { name: /spread monitor/i })).toBeInTheDocument()
    })
  })
})
