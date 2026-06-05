import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from '../components/FilterBar.js'

const defaultProps = {
  availableDexes: ['HL', 'xyz', 'flx'],
  dexFilter: new Set<string>(),
  assetQuery: '',
  onDexToggle: vi.fn(),
  onAssetQueryChange: vi.fn(),
  onClear: vi.fn(),
}

describe('FilterBar', () => {
  describe('DEX toggles', () => {
    it('renders a button for each available DEX', () => {
      render(<FilterBar {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'HL' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'xyz' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'flx' })).toBeInTheDocument()
    })

    it('calls onDexToggle with the DEX name when a button is clicked', async () => {
      const onDexToggle = vi.fn()
      render(<FilterBar {...defaultProps} onDexToggle={onDexToggle} />)
      await userEvent.click(screen.getByRole('button', { name: 'HL' }))
      expect(onDexToggle).toHaveBeenCalledWith('HL')
    })

    it('marks selected DEX buttons as aria-pressed="true"', () => {
      render(<FilterBar {...defaultProps} dexFilter={new Set(['xyz'])} />)
      expect(screen.getByRole('button', { name: 'xyz' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('marks unselected DEX buttons as aria-pressed="false"', () => {
      render(<FilterBar {...defaultProps} dexFilter={new Set(['xyz'])} />)
      expect(screen.getByRole('button', { name: 'HL' })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('asset search input', () => {
    it('renders the asset search input', () => {
      render(<FilterBar {...defaultProps} />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('displays the current assetQuery value', () => {
      render(<FilterBar {...defaultProps} assetQuery="btc" />)
      expect(screen.getByRole('textbox')).toHaveValue('btc')
    })

    it('calls onAssetQueryChange when the user types', async () => {
      const onAssetQueryChange = vi.fn()
      render(<FilterBar {...defaultProps} onAssetQueryChange={onAssetQueryChange} />)
      await userEvent.type(screen.getByRole('textbox'), 'g')
      expect(onAssetQueryChange).toHaveBeenCalledWith('g')
    })
  })

  describe('clear button', () => {
    it('is not visible when no filters are active', () => {
      render(<FilterBar {...defaultProps} />)
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    })

    it('is visible when a DEX filter is active', () => {
      render(<FilterBar {...defaultProps} dexFilter={new Set(['HL'])} />)
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('is visible when an asset query is active', () => {
      render(<FilterBar {...defaultProps} assetQuery="btc" />)
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('calls onClear when clicked', async () => {
      const onClear = vi.fn()
      render(<FilterBar {...defaultProps} assetQuery="btc" onClear={onClear} />)
      await userEvent.click(screen.getByRole('button', { name: /clear/i }))
      expect(onClear).toHaveBeenCalledTimes(1)
    })
  })
})
