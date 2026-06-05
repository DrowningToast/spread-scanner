interface Props {
  availableDexes: string[]
  dexFilter: Set<string>
  assetQuery: string
  onDexToggle: (dex: string) => void
  onAssetQueryChange: (q: string) => void
  onClear: () => void
}

export function FilterBar({
  availableDexes,
  dexFilter,
  assetQuery,
  onDexToggle,
  onAssetQueryChange,
  onClear,
}: Props) {
  const hasFilter = dexFilter.size > 0 || assetQuery.trim().length > 0

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 mb-3 border-b border-gray-700">
      <span className="text-xs text-gray-500 font-mono uppercase tracking-wider mr-1">DEX</span>
      {availableDexes.map((dex) => {
        const selected = dexFilter.has(dex)
        return (
          <button
            key={dex}
            aria-pressed={selected}
            onClick={() => onDexToggle(dex)}
            className={`px-2 py-0.5 rounded text-xs font-mono border transition-colors ${
              selected
                ? 'bg-cyan-700 border-cyan-500 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'
            }`}
          >
            {dex}
          </button>
        )
      })}

      <div className="flex-1 min-w-[160px] max-w-xs ml-2">
        <input
          type="text"
          value={assetQuery}
          onChange={(e) => onAssetQueryChange(e.target.value)}
          placeholder="Search asset or ticker…"
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-400"
        />
      </div>

      {hasFilter && (
        <button
          onClick={onClear}
          className="text-xs font-mono text-gray-500 hover:text-gray-300 underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}
