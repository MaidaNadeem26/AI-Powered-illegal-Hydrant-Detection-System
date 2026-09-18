export type SatelliteCollection = 'SENTINEL-1' | 'SENTINEL-2'

export interface SatelliteProduct {
  id: string
  name: string
  collection: SatelliteCollection
  startDate: string | null
  endDate: string | null
  downloadPath: string | null
}

interface SearchResponse {
  products: SatelliteProduct[]
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export async function searchSatelliteProducts(input: {
  geometry: GeoJSON.Feature<GeoJSON.Polygon>
  startDate: string
  endDate: string
  collection: SatelliteCollection
}) {
  const response = await fetch(`${API_URL}/api/satellite/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as SearchResponse & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Satellite search failed.')
  return payload.products
}
