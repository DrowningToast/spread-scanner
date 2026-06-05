import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../hooks/useSpreadMonitor.js', () => ({
  useSpreadMonitor: vi.fn().mockReturnValue({
    rows: [],
    tick: 0,
    isLoading: false,
    isError: false,
    error: null,
  }),
}))

import { App } from '../App.js'

describe('App', () => {
  it('renders without crashing', () => {
    expect(() => render(<App />)).not.toThrow()
  })

  it('renders the Spread Monitor title', () => {
    render(<App />)
    expect(screen.getByText(/spread monitor/i)).toBeInTheDocument()
  })

  it('renders SpreadMonitor inside the component tree', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /spread monitor/i })).toBeInTheDocument()
  })
})
