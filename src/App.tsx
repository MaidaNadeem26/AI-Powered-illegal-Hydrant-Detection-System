import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import { analyzeSatelliteProduct, type AnalysisResponse, type SatelliteProduct, type SearchRequest } from './api'
import { ConfidenceBar } from './components/ConfidenceBar'
import { SkeletonCard } from './components/Skeleton'
import { EmptyState } from './components/EmptyState'
import './App.css'

type ProgressStatus = 'pending' | 'active' | 'done' | 'failed'
type StepKey = 'search' | 'analyze'
interface ProgressStep {
  key: StepKey
  label: string
  detail: string
  status: ProgressStatus
}

const DEFAULT_CENTER: L.LatLngExpression = [24.92, 67.07] // Karachi, Pakistan
const MAX_AREA_KM2 = 100

function recentDate() {
  const value = new Date()
  value.setDate(value.getDate() - 30)
  return value.toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function areaKm2(bounds: L.LatLngBounds) {
  const latitude = (bounds.getCenter().lat * Math.PI) / 180
  return Math.abs((bounds.getNorth() - bounds.getSouth()) * 111.32 * (bounds.getEast() - bounds.getWest()) * 111.32 * Math.cos(latitude))
}

export function App() {
  const mapElement = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const selectionRef = useRef<L.Rectangle | null>(null)
  const previewRef = useRef<L.Rectangle | null>(null)
  const hotspotRef = useRef<L.Marker | null>(null)
  const firstCornerRef = useRef<L.LatLng | null>(null)

  const [geometry, setGeometry] = useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null)
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null)
  const [response, setResponse] = useState<AnalysisResponse | null>(null)
  const [startDate, setStartDate] = useState(recentDate)
  const [endDate, setEndDate] = useState(today)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const [steps, setSteps] = useState<ProgressStep[]>([
    { key: 'search', label: 'Fetching Sentinel-2 imagery…', detail: 'Querying Copernicus catalog for freshest cloud-free pass', status: 'pending' },
    { key: 'analyze', label: 'Running AI analysis…', detail: 'Screening for reservoirs, manifolds, pipes & tanker tracks', status: 'pending' },
  ])

  const area = useMemo(() => (bounds ? areaKm2(bounds) : 0), [bounds])
  const dateError = startDate > endDate ? 'Start date must be before or on end date.' : null
  const areaExceeded = area > MAX_AREA_KM2

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapElement.current || mapRef.current) return

    const map = L.map(mapElement.current, { zoomControl: false }).setView(DEFAULT_CENTER, 12)
    mapRef.current = map

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri &mdash; Sentinel-2 MSI', maxZoom: 19 }
    )
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    })

    satellite.addTo(map)
    L.control.layers({ 'Satellite imagery': satellite, Streets: streets }, undefined, { position: 'topright' }).addTo(map)

    const onMove = (event: L.LeafletMouseEvent) => {
      if (!firstCornerRef.current) return
      previewRef.current?.remove()
      previewRef.current = L.rectangle(L.latLngBounds(firstCornerRef.current, event.latlng), {
        color: '#16324F',
        weight: 1.5,
        dashArray: '5, 5',
        fillOpacity: 0.08,
      }).addTo(map)
    }

    const onClick = (event: L.LeafletMouseEvent) => {
      if (!firstCornerRef.current) {
        firstCornerRef.current = event.latlng
        setError(null)
        return
      }

      const selected = L.latLngBounds(firstCornerRef.current, event.latlng)
      firstCornerRef.current = null
      previewRef.current?.remove()
      selectionRef.current?.remove()

      selectionRef.current = L.rectangle(selected, {
        color: '#16324F',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#16324F',
        fillOpacity: 0.12,
      }).addTo(map)

      const sw = selected.getSouthWest()
      const ne = selected.getNorthEast()
      setGeometry({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [sw.lng, sw.lat],
              [ne.lng, sw.lat],
              [ne.lng, ne.lat],
              [sw.lng, ne.lat],
              [sw.lng, sw.lat],
            ],
          ],
        },
      })
      setBounds(selected)
      setResponse(null)
    }

    map.on('mousemove', onMove)
    map.on('click', onClick)

    return () => {
      map.off('mousemove', onMove)
      map.off('click', onClick)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update Map Pin when Hotspot is detected
  useEffect(() => {
    const map = mapRef.current
    const hotspot = response?.hotspot
    hotspotRef.current?.remove()
    if (!map || !hotspot) return

    const customIcon = L.divIcon({
      className: 'hotspot-custom-marker',
      html: '<div class="hotspot-marker-pin pending" aria-hidden="true"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 22],
      popupAnchor: [0, -22],
    })

    const signsList = response?.analysis?.signs?.slice(0, 3)?.map((s) => `<li style="margin-bottom: 4px; color: #10201c;">• ${s}</li>`)?.join('') ?? ''

    const popupHtml = `
      <div style="min-width: 220px; font-family: 'Public Sans', sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 600; color: #16324f;">${hotspot.source.productId.slice(0, 16)}</span>
          <span style="font-size: 11px; font-weight: 600; color: #8b631b; background: #f1e6cd; padding: 1px 6px; border-radius: 999px; border: 1px solid #b4832a;">Needs review</span>
        </div>
        <div style="font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px; color: #10201c; margin-bottom: 4px;">${hotspot.label}</div>
        <p style="font-size: 12px; color: #526059; margin: 0 0 8px; line-height: 1.4;">${hotspot.summary}</p>
        ${signsList ? `<ul style="list-style: none; padding: 0; font-size: 11px; margin: 0 0 10px;">${signsList}</ul>` : ''}
        <div style="border-top: 1px solid #d3dad7; padding-top: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #839089; display: flex; justify-content: space-between;">
          <span>imageUsable: true</span>
          <span>${hotspot.latitude.toFixed(4)}° N, ${hotspot.longitude.toFixed(4)}° E</span>
        </div>
      </div>
    `

    hotspotRef.current = L.marker([hotspot.latitude, hotspot.longitude], { icon: customIcon })
      .addTo(map)
      .bindPopup(popupHtml)
      .openPopup()

    map.flyTo([hotspot.latitude, hotspot.longitude], Math.max(map.getZoom(), 14), { duration: 1.2 })

    return () => {
      hotspotRef.current?.remove()
    }
  }, [response])

  function clearAreaSelection() {
    firstCornerRef.current = null
    previewRef.current?.remove()
    selectionRef.current?.remove()
    hotspotRef.current?.remove()
    setGeometry(null)
    setBounds(null)
    setResponse(null)
    setError(null)
  }

  function updateStep(key: StepKey, status: ProgressStatus) {
    setSteps((current) => current.map((step) => (step.key === key ? { ...step, status } : step)))
  }

  async function analyzeArea() {
    if (!geometry || dateError || running || areaExceeded) return
    setRunning(true)
    setError(null)
    setResponse(null)

    setSteps([
      { key: 'search', label: 'Fetching Sentinel-2 imagery…', detail: 'Querying Copernicus catalog for freshest cloud-free pass', status: 'active' },
      { key: 'analyze', label: 'Running AI analysis…', detail: 'Screening for reservoirs, manifolds, pipes & tanker tracks', status: 'pending' },
    ])

    const request: SearchRequest = { geometry, startDate, endDate, collection: 'SENTINEL-2' }

    try {
      updateStep('search', 'done')
      updateStep('analyze', 'active')
      const res = await analyzeSatelliteProduct(request)
      setResponse(res)
      updateStep('analyze', 'done')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Satellite analysis could not be completed.'
      setError(
        message.includes('Failed to fetch') || message.includes('ECONNREFUSED')
          ? 'Cannot connect to backend server on port 3001. Please make sure "npm run dev:server" is active.'
          : message
      )
      setSteps((current) => current.map((step) => (step.status === 'active' ? { ...step, status: 'failed' } : step)))
    } finally {
      setRunning(false)
    }
  }

  const analysis = response?.analysis
  const hotspot = response?.hotspot ?? null
  const centerPin = Boolean(hotspot && analysis?.latitude === null)

  return (
    <div className="screening-container">
      {/* Mobile Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Controls */}
      <aside className={`screening-sidebar ${mobileDrawerOpen ? 'open' : ''}`}>
        {/* Mobile Header with close button */}
        <div className="flex lg:hidden items-center justify-between px-6 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--teal)]" />
            <span className="text-xs font-semibold text-[var(--teal)]">Screening parameters</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-alt)]"
            aria-label="Close screening panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="screening-sidebar-scroll space-y-6">
          {/* Step 1: Area Selection */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[var(--teal)] font-semibold">Step 01</span>
              {bounds && (
                <button
                  type="button"
                  onClick={clearAreaSelection}
                  className="text-xs font-medium text-[var(--brick)] hover:underline flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear area
                </button>
              )}
            </div>

            <div>
              <h2 className="text-base font-semibold text-[var(--ink)]">Define geographic bounding box</h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">Click two opposite corners on the map to define an extraction zone.</p>
            </div>

            {bounds ? (
              <div className="p-3.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-alt)] flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-[var(--ink-muted)]">Selected area</div>
                  <div className="text-lg font-bold text-[var(--ink)] font-mono">
                    {area.toFixed(2)} <span className="text-xs font-normal text-[var(--ink-muted)]">km²</span>
                  </div>
                </div>
                {areaExceeded ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] text-xs font-medium bg-[var(--brick-tint)] text-[var(--brick)] border border-[var(--brick)]">
                    Exceeds 100 km² limit
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--radius-pill)] text-xs font-medium bg-[var(--moss-tint)] text-[var(--moss)] border border-[var(--moss)]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Area confirmed
                  </span>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-[var(--radius-sm)] border border-dashed border-[var(--line-strong)] bg-[var(--bg)] flex items-center gap-3 text-[var(--ink-muted)]">
                <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--teal-tint)] text-[var(--teal)] flex items-center justify-center font-bold text-xs">
                  +
                </div>
                <div className="text-xs">
                  <strong className="block text-[var(--ink)] font-medium">No area selected</strong>
                  Click map for first corner, move, then click opposite corner.
                </div>
              </div>
            )}
          </section>

          <hr className="border-[var(--line)]" />

          {/* Step 2: Time Window */}
          <section className="space-y-3">
            <span className="text-xs font-mono text-[var(--teal)] font-semibold">Step 02</span>
            <div>
              <h2 className="text-base font-semibold text-[var(--ink)]">Imagery time window</h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">Filter Sentinel-2 multispectral passes within this range.</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="startDateInput" className="block text-xs font-medium text-[var(--ink)] mb-1">
                  Start date
                </label>
                <input
                  id="startDateInput"
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] font-mono focus:border-[var(--teal)] focus:ring-1 focus:ring-[var(--teal)]"
                />
              </div>
              <div>
                <label htmlFor="endDateInput" className="block text-xs font-medium text-[var(--ink)] mb-1">
                  End date
                </label>
                <input
                  id="endDateInput"
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={today()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] font-mono focus:border-[var(--teal)] focus:ring-1 focus:ring-[var(--teal)]"
                />
              </div>
            </div>
            {dateError && (
              <p className="text-xs text-[var(--brick)] font-medium" role="alert">
                {dateError}
              </p>
            )}
          </section>

          {/* Primary Action Button */}
          <div>
            <button
              type="button"
              onClick={analyzeArea}
              disabled={!geometry || Boolean(dateError) || running || areaExceeded}
              className="w-full py-2.5 px-4 rounded-[var(--radius-sm)] text-xs font-semibold text-white bg-[var(--teal)] hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {running ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Running AI analysis…</span>
                </>
              ) : (
                <span>Confirm & analyze area</span>
              )}
            </button>
            {!geometry && (
              <p className="text-center text-[11px] text-[var(--ink-faint)] mt-2">Draw a box on the map to activate screening</p>
            )}
          </div>

          {/* Multi-Step Pipeline Status */}
          {(running || steps.some((s) => s.status !== 'pending')) && (
            <section className="p-3.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-alt)] space-y-2.5">
              <span className="text-[11px] font-mono font-semibold text-[var(--ink-muted)]">Pipeline progress</span>
              <ol className="space-y-2.5" aria-label="Pipeline Steps">
                {steps.map((step) => (
                  <li key={step.key} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0">
                      {step.status === 'done' ? (
                        <span className="w-3.5 h-3.5 rounded-full bg-[var(--moss)] text-white inline-flex items-center justify-center text-[9px] font-bold">
                          ✓
                        </span>
                      ) : step.status === 'active' ? (
                        <span className="relative flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--teal)] opacity-75" />
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[var(--teal)] items-center justify-center text-[8px] text-white font-bold">
                            •
                          </span>
                        </span>
                      ) : step.status === 'failed' ? (
                        <span className="w-3.5 h-3.5 rounded-full bg-[var(--brick)] text-white inline-flex items-center justify-center text-[9px] font-bold">
                          ✕
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] inline-flex items-center justify-center text-[8px] text-[var(--ink-faint)]">
                          ○
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium ${step.status === 'active' ? 'text-[var(--teal-dark)] font-semibold' : 'text-[var(--ink)]'}`}>
                        {step.label}
                      </div>
                      <div className="text-[11px] text-[var(--ink-muted)]">{step.detail}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Error Message Box */}
          {error && (
            <div className="p-3.5 rounded-[var(--radius-sm)] border border-[var(--brick)] bg-[var(--brick-tint)] text-[var(--ink)] space-y-2" role="alert">
              <div className="flex items-center gap-2 font-semibold text-xs text-[var(--brick)]">
                <span>Analysis notice</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--ink)]">{error}</p>
              <button
                type="button"
                onClick={analyzeArea}
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-alt)]"
              >
                Retry analysis
              </button>
            </div>
          )}

          {/* Analysis Running Skeleton */}
          {running && !response && (
            <div className="space-y-3">
              <SkeletonCard />
            </div>
          )}

          {/* Result Panel */}
          {response && (
            <ResultCard
              analysis={analysis}
              hotspot={hotspot}
              centerPin={centerPin}
              product={response.product}
              image={response.image}
              hotspotId={response.hotspotId}
            />
          )}

          {/* Civic Note */}
          <div className="pt-4 border-t border-[var(--line)]">
            <p className="text-[11px] text-[var(--ink-faint)] leading-normal">
              Satellite imagery reveals physical signatures, not intent or legal entitlement. Global Water Theft Detection & Monitoring provides screening signals that require municipal field verification before regulatory action.
            </p>
          </div>
        </div>
      </aside>

      {/* Map Panel */}
      <section className="screening-map-panel" aria-label="Interactive satellite map">
        {/* Map Header Overlay */}
        <div className="map-floating-badge map-status-pill font-mono">
          <span className="w-2 h-2 rounded-full bg-[var(--moss)]" />
          <span>Karachi sector</span>
          <span className="text-[var(--line)]">|</span>
          <span className="text-[11px] text-[var(--ink-muted)]">Sentinel-2 MSI Level-2A</span>
        </div>

        {/* Map Drawing Helper */}
        <div className="map-floating-badge map-instruction-pill hidden sm:flex">
          <svg className="w-3.5 h-3.5 text-[var(--teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <span>{bounds ? 'Area defined. Adjust or click Confirm & analyze.' : 'Click two corners on map to enclose area of interest.'}</span>
        </div>

        {/* Persistent Map Legend */}
        <div className="map-floating-badge map-legend-pill">
          <span className="text-[10px] font-mono font-semibold text-[var(--ink-muted)]">Map legend</span>
          <div className="flex items-center gap-2 text-[11px] text-[var(--ink)]">
            <span className="w-3 h-3 rounded-[2px] border border-dashed border-[var(--teal)] bg-[var(--teal-tint)]" />
            <span>Area of interest</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--ink)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" />
            <span>Potential extraction hotspot</span>
          </div>
        </div>

        {/* Leaflet Canvas */}
        <div ref={mapElement} className="screening-map" />

        {/* Mobile Floating Drawer Button */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="mobile-drawer-toggle"
          aria-label="Open screening parameters drawer"
        >
          <span>{bounds ? `${area.toFixed(1)} km² selected` : 'Select area & dates'}</span>
        </button>
      </section>
    </div>
  )
}

interface ResultCardProps {
  analysis: AnalysisResponse['analysis'] | undefined
  hotspot: AnalysisResponse['hotspot']
  centerPin: boolean
  product: SatelliteProduct
  image: AnalysisResponse['image']
  hotspotId?: string
}

function ResultCard({ analysis, hotspot, centerPin, product, image, hotspotId }: ResultCardProps) {
  if (!analysis) return null

  if (!analysis.imageUsable) {
    return (
      <EmptyState
        title="Satellite image unusable"
        description="Heavy cloud cover, atmospheric haze, or sensor nodata prevented visual screening. Try widening your date window to fetch an alternative satellite pass."
        className="bg-[var(--surface-alt)] border-[var(--line-strong)]"
      />
    )
  }

  const isHotspot = Boolean(hotspot && analysis.isPotentialWaterExtractionHotspot)

  return (
    <div className="p-4 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-[var(--teal)]">Live AI Detection</span>
          {analysis.usedModel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-mono font-medium bg-[var(--teal-tint)] text-[var(--teal-dark)] border border-[var(--teal)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] animate-pulse"></span>
              {analysis.usedModel}
            </span>
          )}
        </div>
        {isHotspot ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] text-[11px] font-medium bg-[var(--gold-tint)] text-[var(--gold)] border border-[var(--gold)]">
            Needs review
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] text-[11px] font-medium bg-[var(--surface-alt)] text-[var(--ink-muted)] border border-[var(--line)]">
            No extraction signs
          </span>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--ink)] font-[var(--font-display)]">
          {isHotspot ? 'Potential water extraction hotspot' : 'No anomalous extraction sighted'}
        </h3>
        <p className="text-xs text-[var(--ink-muted)] mt-1 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Visual Confidence Meter */}
      <ConfidenceBar confidence={analysis.confidence} />

      {/* Visual Evidence Signs */}
      {analysis.signs.length > 0 && (
        <div>
          <div className="text-[11px] font-mono text-[var(--ink-muted)] mb-1.5">
            Physical evidence observed
          </div>
          <ul className="space-y-1.5" aria-label="Physical Signs">
            {analysis.signs.map((sign) => (
              <li key={sign} className="flex items-start gap-2 text-xs text-[var(--ink)] bg-[var(--bg)] px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--line)]">
                <span className="text-[var(--teal)] font-bold mt-0.5">•</span>
                <span>{sign}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Processed Satellite Imagery Preview */}
      <div className="rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line-strong)] bg-[var(--surface-alt)]">
        <div className="relative aspect-video">
          <img
            src={image.dataUrl || '/images/satellite-detection.jpg'}
            alt="Copernicus Sentinel-2 processed imagery preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--surface)]/95 text-[var(--ink)] border border-[var(--line-strong)] font-mono text-[10px] font-medium backdrop-blur-xs shadow-xs">
            Sentinel-2 B04/B03/B02 True Color
          </div>
          {analysis.usedModel && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface)]/95 text-[var(--teal-dark)] border border-[var(--teal)] font-mono text-[10px] font-semibold backdrop-blur-xs shadow-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] animate-pulse"></span>
              <span>{analysis.usedModel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Readout */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--line)] text-xs text-[var(--ink-muted)] font-mono">
        <div>
          <span className="block text-[10px] text-[var(--ink-faint)]">Dimensions</span>
          <span className="text-[var(--ink)]">{image.width} × {image.height}px ({(image.bytes / 1024).toFixed(0)} KB)</span>
        </div>
        <div>
          <span className="block text-[10px] text-[var(--ink-faint)]">Acquisition</span>
          <span className="text-[var(--ink)]">{product.startDate ? new Date(product.startDate).toLocaleDateString() : 'Recent pass'}</span>
        </div>
        {hotspot && (
          <div className="col-span-2">
            <span className="block text-[10px] text-[var(--ink-faint)]">Pin placement</span>
            <span className="text-[var(--ink)]">
              {hotspot.latitude.toFixed(5)}° N, {hotspot.longitude.toFixed(5)}° E {centerPin && '(Region center)'}
            </span>
          </div>
        )}
      </div>

      {/* Hotspot Database Link */}
      {hotspotId && (
        <div className="pt-2">
          <Link
            to={`/hotspots/${hotspotId}`}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--teal-dark)] bg-[var(--teal-tint)] border border-[var(--teal)] hover:bg-[var(--surface-alt)] transition-colors"
          >
            <span>Open case dossier</span>
          </Link>
        </div>
      )}
    </div>
  )
}

export default App
