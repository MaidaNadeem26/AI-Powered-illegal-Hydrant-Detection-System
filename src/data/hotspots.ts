export interface Hotspot {
  id: string
  lat: number
  lng: number
  label: string
}

export const hotspots: Hotspot[] = [
  { id: '1', lat: 33.6844, lng: 73.0479, label: 'Sample hydrant — Islamabad' },
  { id: '2', lat: 24.8607, lng: 67.0011, label: 'Sample hydrant — Karachi' },
  { id: '3', lat: 31.5497, lng: 74.3436, label: 'Sample hydrant — Lahore' },
]