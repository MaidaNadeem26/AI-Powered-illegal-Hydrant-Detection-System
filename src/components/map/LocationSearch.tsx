import { useState } from 'react'
import { searchLocation, type GeocodeResult } from '../../lib/geocode'

interface Props {
  onSelect: (position: [number, number]) => void
}

export default function LocationSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [loading, setLoading] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    try {
      const found = await searchLocation(query)
      setResults(found)
      if (found.length > 0) onSelect([found[0].lat, found[0].lng])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handlePick(result: GeocodeResult) {
    onSelect([result.lat, result.lng])
    setResults([])
    setQuery(result.displayName)
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 focus-within:border-slate-400 focus-within:bg-white transition-colors">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-slate-400 shrink-0"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a location"
            className="text-sm outline-none bg-transparent flex-1 text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          className="text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md px-3 py-1.5 transition-colors shrink-0 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? '...' : 'Go'}
        </button>
      </form>

      {results.length > 1 && (
        <ul className="mt-2 max-h-48 overflow-y-auto rounded-md border border-slate-200 text-sm divide-y divide-slate-100">
          {results.map((r, i) => (
            <li
              key={i}
              onClick={() => handlePick(r)}
              className="px-3 py-2 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {r.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}