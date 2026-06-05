import { Component, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SpreadMonitor } from './components/SpreadMonitor.js'
import { OndoSpreadMonitor } from './components/OndoTradesTab.js'

const queryClient = new QueryClient()

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return <div className="text-red-400 text-sm">Ondoperps failed to load: {(this.state.error as Error).message}</div>
    }
    return this.props.children
  }
}

type Tab = 'spreads' | 'ondo'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('spreads')

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4 font-mono">
        <div className="flex gap-1 mb-6 border-b border-gray-700">
          <TabButton label="HL HIP3 Spreads" active={activeTab === 'spreads'} onClick={() => setActiveTab('spreads')} />
          <TabButton label="Ondoperps Equities" active={activeTab === 'ondo'} onClick={() => setActiveTab('ondo')} />
        </div>
        {activeTab === 'spreads' && <SpreadMonitor />}
        {activeTab === 'ondo' && (
          <ErrorBoundary>
            <OndoSpreadMonitor />
          </ErrorBoundary>
        )}
      </div>
    </QueryClientProvider>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-2 text-sm -mb-px border-b-2 transition-colors',
        active
          ? 'border-cyan-400 text-cyan-400'
          : 'border-transparent text-gray-400 hover:text-gray-200',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
