import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../hooks/useOndoSpreadMonitor.js', () => ({
  useOndoSpreadMonitor: vi.fn(),
}))

import { OndoSpreadMonitor } from '../components/OndoTradesTab.js'
import { useOndoSpreadMonitor } from '../hooks/useOndoSpreadMonitor.js'

const mockUseOndoSpreadMonitor = vi.mocked(useOndoSpreadMonitor)

function makeRow(coin: string) {
  return {
    coin,
    dex: 'ondoperps',
    currentPct: 0.15,
    avgPct: 0.12,
    maxPct: 0.2,
    consistency: 0.8,
    samples: 5,
    dayNtlVlm: undefined,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OndoSpreadMonitor', () => {
  describe('loading state', () => {
    beforeEach(() => {
      mockUseOndoSpreadMonitor.mockReturnValue({
        rows: [],
        tick: 0,
        isLoading: true,
        isError: false,
        error: undefined,
      })
    })

    it('shows loading message', () => {
      render(<OndoSpreadMonitor />)
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('does not render the table when loading', () => {
      render(<OndoSpreadMonitor />)
      expect(document.querySelector('table')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    beforeEach(() => {
      mockUseOndoSpreadMonitor.mockReturnValue({
        rows: [],
        tick: 0,
        isLoading: false,
        isError: true,
        error: new Error('API failed'),
      })
    })

    it('shows error message', () => {
      render(<OndoSpreadMonitor />)
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })

    it('includes the error message text', () => {
      render(<OndoSpreadMonitor />)
      expect(screen.getByText(/API failed/)).toBeInTheDocument()
    })
  })

  describe('data state', () => {
    beforeEach(() => {
      mockUseOndoSpreadMonitor.mockReturnValue({
        rows: [makeRow('AAPL'), makeRow('TSLA')],
        tick: 2,
        isLoading: false,
        isError: false,
        error: undefined,
      })
    })

    it('renders the spread table when rows are present', () => {
      render(<OndoSpreadMonitor />)
      expect(document.querySelector('table')).toBeInTheDocument()
    })

    it('displays tick number in the header', () => {
      render(<OndoSpreadMonitor />)
      expect(screen.getByText(/tick\s*#\s*2/i)).toBeInTheDocument()
    })

    it('shows 60 min window label', () => {
      render(<OndoSpreadMonitor />)
      expect(screen.getByText(/60\s*min/i)).toBeInTheDocument()
    })

    it('shows coin names from rows', () => {
      render(<OndoSpreadMonitor />)
      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('TSLA')).toBeInTheDocument()
    })

    it('renders the "Ondo Spread Monitor" title', () => {
      render(<OndoSpreadMonitor />)
      expect(screen.getByText(/ondo spread monitor/i)).toBeInTheDocument()
    })
  })
})
