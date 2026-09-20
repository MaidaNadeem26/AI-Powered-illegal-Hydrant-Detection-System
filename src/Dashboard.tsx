import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet.markercluster'
import { exportHotspots, hotspotStats, listHotspots, type HotspotListItem } from './dashboardApi'
import './Dashboard.css'

const statuses = ['pending', 'verified', 'unverified', 'further_investigation']
const statusLabel = (value: string) => value.replace('_', ' ')

function Dashboard() {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<HotspotListItem[]>([])
  const [stats, setStats] = useState<{ counts: Record<string, number>; countries: string[]; regions: string[] }>({ counts: {}, countries: [], regions: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const query = params.toString()

  useEffect(() => { let cancelled = false; setLoading(true); Promise.all([listHotspots(params), hotspotStats(params)]).then(([result, summary]) => { if (!cancelled) { setItems(result.items); setStats(summary) } }).catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error ? caught.message : 'Dashboard could not load.') }).finally(() => { if (!cancelled) setLoading(false) }); return () => { cancelled = true } }, [query])

  const activeFilters = useMemo(() => [...params.entries()].filter(([key, value]) => value && !['page', 'pageSize'].includes(key)), [query])
  const setFilter = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); next.delete('page'); setParams(next) }

  return <main className="dashboard-shell"><div className="dashboard-header"><div><p className="eyebrow">Investigation dashboard</p><h1>Potential water-extraction detections</h1><p className="dashboard-subtitle">Review model findings, field visits, and evidence in one place.</p></div><button className="secondary-button" type="button" onClick={() => exportHotspots(params)}>Export CSV</button></div><div className="status-counts">{statuses.map((status) => <button key={status} className={`status-count status-${status}`} type="button" onClick={() => setFilter('status', status)}><strong>{stats.counts[status] ?? 0}</strong><span>{statusLabel(status)}</span></button>)}</div><section className="dashboard-filters"><label>Country<select value={params.get('country') ?? ''} onChange={(event) => setFilter('country', event.target.value)}><option value="">All countries</option>{stats.countries.map((country) => <option key={country}>{country}</option>)}</select></label><label>Region<input value={params.get('region') ?? ''} onChange={(event) => setFilter('region', event.target.value)} placeholder="Any region" /></label><label>Minimum confidence<input type="number" min="0" max="1" step=".1" value={params.get('minConfidence') ?? ''} onChange={(event) => setFilter('minConfidence', event.target.value)} placeholder="0.0" /></label><label>Search<input value={params.get('q') ?? ''} onChange={(event) => setFilter('q', event.target.value)} placeholder="Location or summary" /></label></section>{activeFilters.length > 0 && <div className="filter-summary"><span>Active filters: {activeFilters.map(([key, value]) => `${key}: ${value}`).join(' · ')}</span><button type="button" onClick={() => setParams({})}>Clear filters</button></div>}<section className="dashboard-results"><DashboardMap items={items} /><div className="hotspot-list"><div className="list-heading"><h2>Detections</h2><span>{items.length} shown</span></div>{loading ? <p className="empty-state">Loading detections...</p> : error ? <p className="error-box" role="alert">{error}</p> : items.length === 0 ? <p className="empty-state">No detections match these filters.</p> : items.map((item) => <Link className="hotspot-row" to={`/hotspots/${item.id}`} key={item.id}><span className={`row-marker status-${item.status}`}>{item.status === 'pending' ? '?' : item.status === 'verified' ? 'V' : item.status === 'unverified' ? 'U' : '!'}</span><span className="row-main"><strong>{item.country ?? 'Unknown country'}{item.region ? `, ${item.region}` : ''}</strong><small>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)} · {item.detection_count} detection(s)</small></span><span className="row-meta"><b>{Math.round(item.latest_confidence * 100)}%</b><small>{statusLabel(item.status)}</small></span></Link>)}</div></section></main>
}

function DashboardMap({ items }: { items: HotspotListItem[] }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  useEffect(() => { if (!element) return; const map = L.map(element, { zoomControl: false }).setView([25, 67], 5); const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri' }).addTo(map); const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }); L.control.layers({ Satellite: satellite, Streets: streets }).addTo(map); const cluster = L.markerClusterGroup(); items.forEach((item) => { const icon = L.divIcon({ className: 'dashboard-pin', html: `<span class="status-${item.status}">${item.status === 'pending' ? '?' : item.status === 'verified' ? 'V' : item.status === 'unverified' ? 'U' : '!'}</span>` }); cluster.addLayer(L.marker([item.latitude, item.longitude], { icon }).bindPopup(`<strong>${item.country ?? 'Unknown country'}</strong><br><a href="/hotspots/${item.id}">Open detection</a>`)) }); map.addLayer(cluster); if (items.length) map.fitBounds(L.latLngBounds(items.map((item) => [item.latitude, item.longitude] as [number, number])), { padding: [24, 24] }); return () => { map.remove() } }, [element, items]); return <div className="dashboard-map" ref={setElement} />
}

export default Dashboard
