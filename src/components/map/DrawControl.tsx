import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'

interface Props {
  onAreaSelected?: (geojson: GeoJSON.Feature) => void
}

export default function DrawControl({ onAreaSelected }: Props) {
  const map = useMap()

  useEffect(() => {
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    const drawControl = new (L.Control as any).Draw({
      draw: {
        polygon: true,
        rectangle: true,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
      edit: { featureGroup: drawnItems },
    })
    map.addControl(drawControl)

    function handleCreated(e: any) {
      drawnItems.clearLayers()
      drawnItems.addLayer(e.layer)
      onAreaSelected?.(e.layer.toGeoJSON())
    }

    map.on((L as any).Draw.Event.CREATED, handleCreated)

    return () => {
      map.off((L as any).Draw.Event.CREATED, handleCreated)
      map.removeControl(drawControl)
      map.removeLayer(drawnItems)
    }
  }, [map, onAreaSelected])

  return null
}