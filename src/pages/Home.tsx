import { useState } from 'react'
import MapView from '../components/map/MapView'
import { searchSatelliteProducts, type SatelliteCollection, type SatelliteProduct } from '../services/satelliteApi'

const initialStartDate = '2025-01-01'
const initialEndDate = '2026-01-01'

function Home() {
  const [geometry, setGeometry] = useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null)
  const [collection, setCollection] = useState<SatelliteCollection>('SENTINEL-2')
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [products, setProducts] = useState<SatelliteProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    if (!geometry) {
      setError('Draw a polygon or rectangle on the map first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      setProducts(await searchSatelliteProducts({ geometry, startDate, endDate, collection }))
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Satellite search failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">AI Hydrant Detection System</h1>
            <p className="text-xs text-slate-500">Satellite data pipeline</p>
          </div>
          <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:block">Copernicus Data Space</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="relative min-h-[560px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <MapView onAreaSelected={(selectedGeometry) => { setGeometry(selectedGeometry); setError(null) }} />
          <div className="absolute left-4 top-4 z-[1000] max-w-xs rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur-sm">
            Draw an area on the map to search Sentinel imagery.
          </div>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Satellite data search</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Use the same area with different dates later to compare imagery.</p>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-700">Collection<select value={collection} onChange={(event) => setCollection(event.target.value as SatelliteCollection)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="SENTINEL-2">Sentinel-2 optical</option><option value="SENTINEL-1">Sentinel-1 radar</option></select></label>
            <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-slate-700">Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-2 py-2 text-sm" /></label><label className="text-sm font-medium text-slate-700">End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-2 py-2 text-sm" /></label></div>
            <button type="button" onClick={handleSearch} disabled={loading} className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Searching Copernicus...' : 'Search satellite data'}</button>
            {geometry && <p className="text-xs text-emerald-700">Area selected and ready to search.</p>}
            {error && <p className="rounded-md bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Results</h3><span className="text-xs text-slate-500">{products.length} products</span></div>{products.length === 0 ? <p className="mt-3 text-sm text-slate-500">No imagery loaded yet.</p> : <ul className="mt-3 max-h-72 space-y-3 overflow-y-auto">{products.map((product) => <li key={product.id} className="rounded-md border border-slate-200 p-3"><p className="truncate text-xs font-semibold text-slate-800" title={product.name}>{product.name}</p><p className="mt-1 text-xs text-slate-500">{product.startDate ? new Date(product.startDate).toLocaleDateString() : 'Unknown date'}</p></li>)}</ul>}</div>
        </aside>
      </div>
    </main>
  )
}

export default Home
