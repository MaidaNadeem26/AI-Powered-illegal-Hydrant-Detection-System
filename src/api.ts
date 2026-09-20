export type SatelliteCollection = 'SENTINEL-1' | 'SENTINEL-2'

export interface SatelliteProduct {
  id: string
  name: string
  collection: SatelliteCollection
  startDate: string | null
  endDate: string | null
  downloadPath: string | null
  quicklookUrl: string | null
}

export interface SearchRequest {
  collection: SatelliteCollection
  startDate: string
  endDate: string
  geometry: GeoJSON.Feature<GeoJSON.Polygon>
}

export interface AnalysisResult {
  imageUsable: boolean
  isPotentialWaterExtractionHotspot: boolean
  confidence: number
  summary: string
  signs: string[]
  latitude: number | null
  longitude: number | null
}

export interface Hotspot {
  id: string
  label: string
  latitude: number
  longitude: number
  confidence: number
  summary: string
  signs: string[]
  source: {
    productId: string
    productName: string
    collection: SatelliteCollection
    capturedAt: string | null
  }
}

export interface AnalysisResponse {
  analysis: AnalysisResult
  hotspot: Hotspot | null
  product: SatelliteProduct
  image: { width: number; height: number; bytes: number }
  saved?: boolean
  hotspotId?: string
  detectionId?: string
}

const SEARCH_ROUTE = '/api/satellite/search'
const ANALYZE_ROUTE = '/api/satellite/analyze'

async function parseResponse<T>(response: Response, fallback: string) {
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? fallback)
  return payload as T
}

export async function searchSatelliteProducts(request: SearchRequest) {
  const response = await fetch(SEARCH_ROUTE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const payload = await parseResponse<{ products: SatelliteProduct[] }>(response, 'Satellite search failed.')
  return payload.products
}

export async function analyzeSatelliteProduct(request: SearchRequest) {
  const response = await fetch(ANALYZE_ROUTE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return parseResponse<AnalysisResponse>(response, 'Gemini analysis failed.')
}
