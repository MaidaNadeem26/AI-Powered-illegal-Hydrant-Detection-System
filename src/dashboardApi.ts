import type { AnalysisResponse, Hotspot } from './api'

export interface HotspotListItem extends Hotspot {
  country: string | null
  region: string | null
  status: string
  created_at: string
  updated_at: string
  latest_confidence: number
  latest_summary: string
  latest_signs: string[]
  detection_count: number
  last_detected: string | null
  last_verified_at: string | null
  location_is_approximate: boolean
  area_geojson: string
}

export interface HotspotDetail {
  hotspot: HotspotListItem
  detections: Array<Record<string, unknown> & { signs: string[] }>
  verifications: Array<Record<string, unknown> & { evidence: Array<Record<string, unknown>> }>
}

async function request<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, options)
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Request failed.')
  return payload as T
}

export function listHotspots(params: URLSearchParams) { return request<{ items: HotspotListItem[]; total: number; page: number; pageSize: number }>(`/api/hotspots?${params}`) }
export function hotspotStats(params: URLSearchParams) { return request<{ counts: Record<string, number>; countries: string[]; regions: string[] }>(`/api/hotspots/stats?${params}`) }
export function getHotspot(id: string) { return request<HotspotDetail>(`/api/hotspots/${id}`) }
export function updateHotspot(id: string, country: string | null, region: string | null) { return request<HotspotDetail>(`/api/hotspots/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country, region }) }) }
export function submitVerification(id: string, form: FormData) { return request<HotspotDetail>(`/api/hotspots/${id}/verifications`, { method: 'POST', body: form }) }
export function exportHotspots(params: URLSearchParams) { window.location.href = `/api/hotspots/export.csv?${params}` }

export type { AnalysisResponse }
