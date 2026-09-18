export interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
}

export async function searchLocation(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return []

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`
  )

  if (!res.ok) throw new Error('Location search failed')

  const data = await res.json()
  return data.map((item: any) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    displayName: item.display_name,
  }))
}