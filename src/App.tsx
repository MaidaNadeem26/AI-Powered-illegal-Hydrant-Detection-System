import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { analyzeSatelliteProduct, type AnalysisResponse, type SatelliteProduct, type SearchRequest } from './api'
import './App.css'

type ProgressStatus = 'pending' | 'active' | 'done' | 'failed'
type StepKey = 'search' | 'analyze'
interface ProgressStep { key: StepKey; label: string; status: ProgressStatus }

const DEFAULT_CENTER: L.LatLngExpression = [24.92, 67.07]
const MAX_AREA_KM2 = 100

function recentDate() { const value = new Date(); value.setDate(value.getDate() - 30); return value.toISOString().slice(0, 10) }
function today() { return new Date().toISOString().slice(0, 10) }
function areaKm2(bounds: L.LatLngBounds) { const latitude = bounds.getCenter().lat * Math.PI / 180; return Math.abs((bounds.getNorth() - bounds.getSouth()) * 111.32 * (bounds.getEast() - bounds.getWest()) * 111.32 * Math.cos(latitude)) }
function statusIcon(status: ProgressStatus) { return status === 'done' ? '✓' : status === 'failed' ? '!' : status === 'active' ? '•' : '○' }

function App() {
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
  const [steps, setSteps] = useState<ProgressStep[]>([
    { key: 'search', label: 'Finding the latest Sentinel-2 image', status: 'pending' },
    { key: 'analyze', label: 'Fetching the preview and analyzing it with Gemini', status: 'pending' },
  ])

  const area = useMemo(() => bounds ? areaKm2(bounds) : 0, [bounds])
  const dateError = startDate > endDate ? 'Start date must be on or before the end date.' : null

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return
    const map = L.map(mapElement.current, { zoomControl: false }).setView(DEFAULT_CENTER, 12)
    mapRef.current = map
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri', maxZoom: 19 })
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 })
    imagery.addTo(map)
    L.control.layers({ 'Satellite imagery': imagery, Streets: streets }, undefined, { position: 'topright' }).addTo(map)

    const onMove = (event: L.LeafletMouseEvent) => {
      if (!firstCornerRef.current) return
      previewRef.current?.remove()
      previewRef.current = L.rectangle(L.latLngBounds(firstCornerRef.current, event.latlng), { color: '#17607a', weight: 1.5, dashArray: '5 5', fillOpacity: 0.08 }).addTo(map)
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
      selectionRef.current = L.rectangle(selected, { color: '#17607a', weight: 2, fillColor: '#17607a', fillOpacity: 0.12 }).addTo(map)
      const sw = selected.getSouthWest()
      const ne = selected.getNorthEast()
      setGeometry({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[sw.lng, sw.lat], [ne.lng, sw.lat], [ne.lng, ne.lat], [sw.lng, ne.lat], [sw.lng, sw.lat]]] } })
      setBounds(selected)
      setResponse(null)
    }
    map.on('mousemove', onMove)
    map.on('click', onClick)
    return () => { map.off('mousemove', onMove); map.off('click', onClick); map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const hotspot = response?.hotspot
    hotspotRef.current?.remove()
    if (!map || !hotspot) return
    const icon = L.divIcon({ className: 'hotspot-pin-wrapper', html: '<span class="hotspot-pin" aria-hidden="true"></span>', iconSize: [30, 30], iconAnchor: [15, 15] })
    const popup = document.createElement('div')
    const heading = document.createElement('strong'); heading.textContent = hotspot.label; popup.append(heading)
    const confidence = document.createElement('p'); confidence.textContent = `Confidence: ${(hotspot.confidence * 100).toFixed(0)}%`; popup.append(confidence)
    const summary = document.createElement('p'); summary.textContent = hotspot.summary; popup.append(summary)
    hotspotRef.current = L.marker([hotspot.latitude, hotspot.longitude], { icon }).addTo(map).bindPopup(popup).openPopup()
    map.flyTo([hotspot.latitude, hotspot.longitude], Math.max(map.getZoom(), 14), { duration: 0.8 })
    return () => { hotspotRef.current?.remove() }
  }, [response])

  function updateStep(key: StepKey, status: ProgressStatus) { setSteps((current) => current.map((step) => step.key === key ? { ...step, status } : step)) }

  async function analyzeArea() {
    if (!geometry || dateError || running) return
    setRunning(true); setError(null); setResponse(null)
    setSteps([{ key: 'search', label: 'Finding the latest Sentinel-2 image', status: 'active' }, { key: 'analyze', label: 'Fetching the preview and analyzing it with Gemini', status: 'pending' }])
    const request: SearchRequest = { geometry, startDate, endDate, collection: 'SENTINEL-2' }
    try {
      updateStep('search', 'done'); updateStep('analyze', 'active')
      setResponse(await analyzeSatelliteProduct(request))
      updateStep('analyze', 'done')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'The satellite analysis failed.'
      setError(message.includes('Failed to fetch') ? 'The server cannot be reached. Start the backend on port 3001 and check the Vite /api proxy.' : message)
      setSteps((current) => current.map((step) => step.status === 'active' ? { ...step, status: 'failed' } : step))
    } finally { setRunning(false) }
  }

  const analysis = response?.analysis
  const hotspot = response?.hotspot ?? null
  const centerPin = Boolean(hotspot && analysis?.latitude === null)

  return <main className="app-shell">
    <aside className="control-panel">
      <header className="panel-header"><div className="brand-mark" aria-hidden="true"><span /></div><div className="brand-copy"><p className="brand-name">Hydrant Watch</p><h1>Satellite screening</h1></div><span className="system-status"><i />Live</span></header>
      <div className="panel-content">
        <section className="panel-section area-section"><div className="section-heading"><div><p className="section-kicker">Area</p><h2>Choose a rectangle on the map</h2></div><span className="step-number">01</span></div><p className="helper-text">Click two opposite corners. Move the pointer to preview the area.</p>{bounds ? <p className="area-readout"><strong>{area.toFixed(1)} <small>km²</small></strong><span>selected area</span>{area > MAX_AREA_KM2 && <em className="warning-text">Above 100 km²</em>}</p> : <p className="empty-readout"><span className="empty-dot" />No area selected</p>}</section>
        <section className="panel-section"><div className="section-heading"><div><p className="section-kicker">Time period</p><h2>Set an imagery window</h2></div><span className="step-number">02</span></div><div className="date-grid"><label>Start date<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>End date<input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>{dateError && <p className="field-error" role="alert">{dateError}</p>}</section>
        <button className="analyze-button" type="button" onClick={analyzeArea} disabled={!geometry || Boolean(dateError) || running}>{running ? 'Analyzing area...' : 'Analyze area'}</button>
        <section className="panel-section progress-section"><div className="section-heading"><div><p className="section-kicker">Pipeline</p><h2>Analysis progress</h2></div><span className="step-number">03</span></div><ol className="progress-list">{steps.map((step) => <li className={`progress-step ${step.status}`} key={step.key}><span className="status-icon" aria-hidden="true">{statusIcon(step.status)}</span><span>{step.label}</span></li>)}</ol></section>
        {error && <div className="error-box" role="alert"><strong>Analysis failed</strong><span>{error}</span></div>}
        {response && <ResultPanel analysis={analysis} hotspot={hotspot} centerPin={centerPin} product={response.product} image={response.image} />}
      </div>
      <p className="disclaimer">This is a screening result from satellite imagery. It does not show that any water use is illegal. Confirm with a site visit or records before acting.</p>
    </aside>
    <section className="map-panel" aria-label="Satellite map"><div className="map-topbar"><span className="map-title"><i />Satellite imagery</span><span className="map-coordinates">Karachi region · Sentinel-2</span></div><div ref={mapElement} className="map-canvas" /><div className="map-instruction"><span className="crosshair">+</span>Click two opposite corners to select an area</div><div className="map-legend"><span className="legend-line" />Selected area</div></section>
  </main>
}

function ResultPanel({ analysis, hotspot, centerPin, product, image }: { analysis: AnalysisResponse['analysis'] | undefined; hotspot: AnalysisResponse['hotspot']; centerPin: boolean; product: SatelliteProduct; image: AnalysisResponse['image'] }) {
  if (!analysis) return null
  const confidence = Math.round(analysis.confidence * 100)
  return (
    <section className="result-panel">
      <p className="section-kicker">Result</p>
      <h2>{!analysis.imageUsable ? 'The image was not usable, so no conclusion' : hotspot ? 'Potential Water Extraction Hotspot' : 'No hotspot found in this image'}</h2>
      <div className="confidence-row"><span>Confidence</span><strong>{confidence}%</strong></div>
      <div className="confidence-meter" role="meter" aria-label="Analysis confidence" aria-valuenow={confidence} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${confidence}%` }} /></div>
      <p className="result-summary">{analysis.summary}</p>
      <p className="muted-text">Processed image: {image.width} × {image.height}px ({(image.bytes / 1024).toFixed(0)} KB)</p>
      <h3>Source image</h3>
      <dl className="result-details">
        <div><dt>Product</dt><dd>{product?.name ?? 'Unknown'}</dd></div>
        <div><dt>Collection</dt><dd>{product?.collection ?? 'Sentinel-2'}</dd></div>
        <div><dt>Capture date</dt><dd>{product?.startDate ? new Date(product.startDate).toLocaleDateString() : 'Unknown'}</dd></div>
      </dl>
      {analysis.imageUsable && hotspot && (
        <>
          <h3>What the model saw</h3>
          {analysis.signs.length > 0 ? <ul className="sign-list">{analysis.signs.map((sign) => <li key={sign}>{sign}</li>)}</ul> : <p className="muted-text">No specific visual signs were returned.</p>}
          <dl className="result-details">
            <div><dt>Coordinates</dt><dd>{hotspot.latitude.toFixed(5)}, {hotspot.longitude.toFixed(5)}</dd></div>
            {centerPin && <div><dt>Pin placement</dt><dd>Center of selected area, not an exact spot.</dd></div>}
          </dl>
        </>
      )}
    </section>
  )
}

export default App
