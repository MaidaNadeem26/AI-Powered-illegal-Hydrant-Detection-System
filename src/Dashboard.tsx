import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet.markercluster'
import { exportHotspots, hotspotStats, listHotspots, type HotspotListItem } from './dashboardApi'
import { Badge } from './components/Badge'
import { SkeletonTable } from './components/Skeleton'
import { EmptyState } from './components/EmptyState'
import './Dashboard.css'

const statuses = ['pending', 'verified', 'unverified', 'further_investigation'] as const

export function Dashboard() {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<HotspotListItem[]>([])
  const [stats, setStats] = useState<{ counts: Record<string, number>; countries: string[]; regions: string[] }>({
    counts: {},
    countries: [],
    regions: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Local state for debounced inputs
  const [searchInput, setSearchInput] = useState(() => params.get('q') ?? '')
  const [regionInput, setRegionInput] = useState(() => params.get('region') ?? '')
  const [minConfInput, setMinConfInput] = useState(() => params.get('minConfidence') ?? '')

  // Fetch hotspots on query change
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([listHotspots(params), hotspotStats(params)])
      .then(([result, summary]) => {
        if (!cancelled) {
          setItems(result.items)
          setStats(summary)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Investigation records could not be loaded.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [params])

  // Debounce search inputs by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (searchInput.trim()) next.set('q', searchInput.trim())
      else next.delete('q')
      if (regionInput.trim()) next.set('region', regionInput.trim())
      else next.delete('region')
      if (minConfInput.trim()) next.set('minConfidence', minConfInput.trim())
      else next.delete('minConfidence')

      if (next.toString() !== params.toString()) {
        next.delete('page')
        setParams(next)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput, regionInput, minConfInput, params, setParams])

  const activeFilters = useMemo(
    () => [...params.entries()].filter(([key, value]) => value && !['page', 'pageSize'].includes(key)),
    [params]
  )

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) {
      if (next.get(key) === value) {
        next.delete(key) // Toggle off if clicked again
      } else {
        next.set(key, value)
      }
    } else {
      next.delete(key)
    }
    next.delete('page')
    setParams(next)
  }

  const clearAllFilters = () => {
    setSearchInput('')
    setRegionInput('')
    setMinConfInput('')
    setParams(new URLSearchParams())
  }

  const activeStatusFilter = params.get('status')

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-mono text-[var(--teal)] font-semibold">Investigation queue</span>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--ink)] tracking-tight mt-0.5 font-[var(--font-display)]">
            Water extraction hotspots
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-1">
            Review model detections, field inspection visits, and photographic evidence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportHotspots(params)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--ink)] bg-[var(--surface)] border border-[var(--line-strong)] hover:bg-[var(--surface-alt)] transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Status Metric Cards */}
      <div className="stat-card-grid" role="region" aria-label="Status Summary">
        {statuses.map((st) => {
          const isSelected = activeStatusFilter === st
          const count = stats.counts[st] ?? 0
          return (
            <button
              key={st}
              type="button"
              onClick={() => setFilter('status', st)}
              className={`stat-card ${isSelected ? 'active-filter' : ''}`}
            >
              <div
                className="stat-card-indicator"
                style={{
                  backgroundColor:
                    st === 'verified'
                      ? 'var(--moss)'
                      : st === 'pending'
                      ? 'var(--gold)'
                      : st === 'further_investigation'
                      ? 'var(--gold)'
                      : 'var(--brick)',
                }}
              />
              <div className="flex items-center justify-between mb-2">
                <Badge status={st} size="sm" />
                {isSelected && (
                  <span className="text-[10px] font-mono font-semibold text-[var(--teal-dark)] bg-[var(--teal-tint)] px-1.5 py-0.5 rounded-[var(--radius-sm)]">
                    Filter active
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--ink)] font-mono tracking-tight">
                {count}
              </div>
              <div className="text-xs text-[var(--ink-muted)] mt-0.5">
                {st === 'pending' ? 'Awaiting field visit' : st === 'verified' ? 'Confirmed on site' : st === 'unverified' ? 'False alarm' : 'Needs second visit'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Filter Card */}
      <div className="filter-card">
        <div className="filter-grid">
          <div>
            <label htmlFor="countryFilter" className="block text-xs font-semibold text-[var(--ink)] mb-1">
              Country
            </label>
            <select
              id="countryFilter"
              value={params.get('country') ?? ''}
              onChange={(e) => setFilter('country', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--teal)] focus:ring-1 focus:ring-[var(--teal)]"
            >
              <option value="">All countries</option>
              {stats.countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="regionFilter" className="block text-xs font-semibold text-[var(--ink)] mb-1">
              Region
            </label>
            <input
              id="regionFilter"
              type="text"
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value)}
              placeholder="e.g. Sindh, Karachi"
              className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--teal)] focus:ring-1 focus:ring-[var(--teal)]"
            />
          </div>

          <div>
            <label htmlFor="confFilter" className="block text-xs font-semibold text-[var(--ink)] mb-1">
              Minimum confidence
            </label>
            <input
              id="confFilter"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={minConfInput}
              onChange={(e) => setMinConfInput(e.target.value)}
              placeholder="0.00 – 1.00"
              className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] font-mono focus:border-[var(--teal)] focus:ring-1 focus:ring-[var(--teal)]"
            />
          </div>

          <div>
            <label htmlFor="searchFilter" className="block text-xs font-semibold text-[var(--ink)] mb-1">
              Search dossiers
            </label>
            <div className="relative">
              <input
                id="searchFilter"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Keywords, summary, coordinates…"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--teal)] focus:ring-1 focus:ring-[var(--teal)]"
              />
              <svg
                className="w-3.5 h-3.5 text-[var(--ink-faint)] absolute left-2.5 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Filters Pill Row */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-[var(--line)] text-xs text-[var(--ink-muted)]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-[var(--ink)]">Active filters:</span>
              {activeFilters.map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--teal-tint)] text-[var(--teal-dark)] border border-[var(--teal)] text-[11px] font-mono"
                >
                  <strong>{key}:</strong> {value}
                  <button
                    type="button"
                    onClick={() => setFilter(key, '')}
                    className="hover:text-[var(--ink)] ml-0.5"
                    aria-label={`Remove filter ${key}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[var(--teal)] hover:underline font-semibold"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Split View: Map + Hotspot List */}
      <div className="results-split">
        {/* Clustered Map View */}
        <div className="dashboard-map-panel">
          <DashboardMap items={items} />
        </div>

        {/* List of Hotspots (Dashboard Preview Pattern) */}
        <div className="hotspot-list-card">
          <div className="px-4 py-3.5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-alt)]">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">Recorded hotspot dossiers</h2>
            </div>
            <span className="font-mono text-xs text-[var(--ink-muted)]">
              {items.length} {items.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {loading ? (
            <SkeletonTable rows={6} />
          ) : error ? (
            <div className="p-8 text-center" role="alert">
              <h3 className="text-sm font-semibold text-[var(--ink)]">Unable to load dossiers</h3>
              <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-sm mx-auto">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No hotspots match filters"
              description="No recorded detections meet your current filtering criteria. Try expanding the confidence range or clearing filters."
              action={{
                label: 'Reset all filters',
                onClick: clearAllFilters,
              }}
              className="border-none rounded-none"
            />
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {items.map((item) => {
                const dotColor =
                  item.status === 'verified' ? 'moss' : item.status === 'pending' ? 'gold' : 'brick'

                return (
                  <Link
                    key={item.id}
                    to={`/hotspots/${item.id}`}
                    className="hotspot-row-item group"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                      <div className="relative w-12 h-12 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line-strong)] bg-[var(--surface-alt)] flex-shrink-0">
                        <img
                          src="/images/satellite-detection.jpg"
                          alt="Satellite screening thumbnail"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                        <span className={`status-indicator-dot ${dotColor} absolute bottom-1 right-1 border border-white shadow-xs`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--teal)] transition-colors truncate">
                          {item.country ?? 'Unknown country'}
                          {item.region ? `, ${item.region}` : ''}
                        </div>
                        <p className="text-[11px] text-[var(--ink-muted)] line-clamp-1 mt-0.5">
                          {item.latest_summary}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--ink-faint)] font-mono">
                          <span>{item.latitude.toFixed(4)}° N, {item.longitude.toFixed(4)}° E</span>
                          <span>•</span>
                          <span>{item.detection_count} detection(s)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 font-mono">
                      <div className="text-right">
                        <div className="text-xs font-semibold" style={{ color: item.latest_confidence >= 0.7 ? 'var(--moss)' : 'var(--gold)' }}>
                          {item.latest_confidence.toFixed(2)} conf
                        </div>
                        <div className="text-[10px] text-[var(--ink-muted)]">
                          {item.status.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <svg
                        className="w-3.5 h-3.5 text-[var(--ink-faint)] group-hover:text-[var(--teal)] group-hover:translate-x-0.5 transition-all"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DashboardMap({ items }: { items: HotspotListItem[] }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!element) return

    const map = L.map(element, { zoomControl: false }).setView([24.92, 67.07], 8)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri &mdash; Sentinel-2 MSI' }
    ).addTo(map)

    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    })

    L.control.layers({ 'Satellite imagery': satellite, Streets: streets }, undefined, { position: 'topright' }).addTo(map)

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
    })

    items.forEach((item) => {
      const pinColor =
        item.status === 'verified'
          ? '#4C7A5E'
          : item.status === 'pending'
          ? '#B4832A'
          : '#9B4A3E'

      const pinIcon = L.divIcon({
        className: 'dashboard-custom-pin',
        html: `<div class="dashboard-pin-inner" style="background-color: ${pinColor}; color: white;">${
          item.status === 'pending' ? '?' : item.status === 'verified' ? '✓' : '!'
        }</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11],
      })

      const popupContent = `
        <div style="min-width: 190px; font-family: 'Public Sans', sans-serif;">
          <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 600; color: ${pinColor}; margin-bottom: 4px;">
            ${item.status.replace(/_/g, ' ')}
          </div>
          <div style="font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 13px; color: #10201c; margin-bottom: 4px;">
            ${item.country ?? 'Unknown country'}${item.region ? `, ${item.region}` : ''}
          </div>
          <div style="font-size: 11px; color: #526059; margin-bottom: 8px; font-family: 'IBM Plex Mono', monospace;">
            Score: <strong>${item.latest_confidence.toFixed(2)}</strong> · ${item.detection_count} pass(es)
          </div>
          <a href="/hotspots/${item.id}" style="display: block; width: 100%; text-align: center; background: #16324f; color: white; text-decoration: none; font-size: 11px; font-weight: 600; padding: 6px 10px; border-radius: 4px;">
            Open case dossier
          </a>
        </div>
      `

      cluster.addLayer(L.marker([item.latitude, item.longitude], { icon: pinIcon }).bindPopup(popupContent))
    })

    map.addLayer(cluster)

    if (items.length > 0) {
      map.fitBounds(
        L.latLngBounds(items.map((item) => [item.latitude, item.longitude] as [number, number])),
        { padding: [32, 32], maxZoom: 14 }
      )
    }

    return () => {
      map.remove()
    }
  }, [element, items])

  return <div style={{ width: '100%', height: '100%' }} ref={setElement} />
}

export default Dashboard
