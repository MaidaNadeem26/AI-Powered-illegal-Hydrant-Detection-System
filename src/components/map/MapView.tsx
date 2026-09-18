import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

import LocationSearch from './LocationSearch'
import LayerToggle from './LayerToggle'
import DrawControl from './DrawControl'
import Legend from './Legend'
import { hotspots } from '../../data/hotspots'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STREET_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const STREET_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'

const DEFAULT_CENTER: [number, number] = [30.3753, 69.3451]
const DEFAULT_ZOOM = 5

function FlyToPosition({ position }: { position: [number, number] | null }) {
  const map = useMap()
  if (position) map.flyTo(position, 14)
  return null
}

export default function MapView() {
  const [satellite, setSatellite] = useState(false)
  const [searchPosition, setSearchPosition] = useState<[number, number] | null>(null)

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url={satellite ? SATELLITE_URL : STREET_URL}
          attribution={satellite ? SATELLITE_ATTRIBUTION : STREET_ATTRIBUTION}
        />

        <ZoomControl position="bottomright" />

        <DrawControl
          onAreaSelected={(geojson) => {
            console.log('Selected area:', geojson)
          }}
        />

        {searchPosition && <FlyToPosition position={searchPosition} />}

        {hotspots.map((h) => (
          <Marker key={h.id} position={[h.lat, h.lng]}>
            <Popup>
              <span className="text-sm font-medium text-slate-900">{h.label}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000] w-72 rounded-lg border border-slate-200 bg-white/95 backdrop-blur-sm shadow-md p-3 space-y-3">
        <LocationSearch onSelect={setSearchPosition} />
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-500 pt-2">Map view</span>
          <div className="pt-1.5">
            <LayerToggle satellite={satellite} onToggle={setSatellite} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-4 z-[1000]">
        <Legend />
      </div>
    </div>
  )
}