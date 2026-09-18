import type { Feature, Polygon } from 'geojson'

const CATALOGUE_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products'

export type SatelliteCollection = 'SENTINEL-1' | 'SENTINEL-2'

export interface SearchRequest {
  geometry: Feature<Polygon>
  startDate: string
  endDate: string
  collection: SatelliteCollection
}

interface CopernicusProduct {
  Id: string
  Name: string
  S3Path?: string
  ContentDate?: { Start?: string; End?: string }
  Attributes?: Array<{ Name: string; Value: string }>
}

export interface SatelliteProduct {
  id: string
  name: string
  collection: SatelliteCollection
  startDate: string | null
  endDate: string | null
  downloadPath: string | null
}

function polygonWkt(geometry: Feature<Polygon>): string {
  const ring = geometry.geometry.coordinates[0]
  const coordinates = ring.map(([longitude, latitude]) => `${longitude} ${latitude}`).join(', ')
  return `POLYGON ((${coordinates}))`
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export function validateSearchRequest(value: unknown): SearchRequest {
  const request = value as Partial<SearchRequest> | null
  if (!request?.geometry || request.geometry.type !== 'Feature' || request.geometry.geometry?.type !== 'Polygon') {
    throw new Error('A Polygon GeoJSON feature is required.')
  }
  if (!isDate(request.startDate ?? '') || !isDate(request.endDate ?? '')) {
    throw new Error('startDate and endDate must use YYYY-MM-DD format.')
  }
  const startDate = request.startDate
  const endDate = request.endDate
  if (!startDate || !endDate) throw new Error('startDate and endDate are required.')
  if (startDate > endDate) {
    throw new Error('startDate must be before endDate.')
  }
  if (request.collection !== 'SENTINEL-1' && request.collection !== 'SENTINEL-2') {
    throw new Error('collection must be SENTINEL-1 or SENTINEL-2.')
  }
  return request as SearchRequest
}

export async function searchCopernicus(request: SearchRequest): Promise<SatelliteProduct[]> {
  const filter = [
    `Collection/Name eq '${request.collection}'`,
    `OData.CSC.Intersects(area=geography'SRID=4326;${polygonWkt(request.geometry)}')`,
    `ContentDate/Start ge ${request.startDate}T00:00:00.000Z`,
    `ContentDate/Start le ${request.endDate}T23:59:59.999Z`,
  ].join(' and ')
  const url = new URL(CATALOGUE_URL)
  url.searchParams.set('$filter', filter)
  url.searchParams.set('$orderby', 'ContentDate/Start desc')
  url.searchParams.set('$top', '20')

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Copernicus catalogue returned HTTP ${response.status}.`)
  const payload = (await response.json()) as { value?: CopernicusProduct[] }
  return (payload.value ?? []).map((product) => ({
    id: product.Id,
    name: product.Name,
    collection: request.collection,
    startDate: product.ContentDate?.Start ?? null,
    endDate: product.ContentDate?.End ?? null,
    downloadPath: product.S3Path ?? null,
  }))
}
