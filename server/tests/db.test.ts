import { afterEach, describe, expect, it } from 'vitest'
import { db, deriveStatus, listHotspots, saveDetection } from '../db.js'

const geometry = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[67, 24], [67.01, 24], [67.01, 24.01], [67, 24.01], [67, 24]]] } }
const createdIds: string[] = []

afterEach(() => {
  for (const id of createdIds.splice(0)) db.prepare('DELETE FROM hotspots WHERE id = ?').run(id)
})

describe('hotspot persistence', () => {
  it('creates a hotspot and merges a nearby detection within 300m', () => {
    const first = saveDetection({ latitude: 24, longitude: 67, approximate: true, areaGeojson: geometry, confidence: .6, summary: 'first', signs: ['water edge'], productId: 'p1', productName: 'demo one', collection: 'SENTINEL-2', capturedAt: null, imagePath: null, model: 'test' })
    const second = saveDetection({ latitude: 24.0005, longitude: 67.0005, approximate: false, areaGeojson: geometry, confidence: .8, summary: 'second', signs: ['channel'], productId: 'p2', productName: 'demo two', collection: 'SENTINEL-2', capturedAt: null, imagePath: null, model: 'test' })
    createdIds.push(first.hotspotId)
    expect(second.hotspotId).toBe(first.hotspotId)
    expect(second.detectionId).not.toBe(first.detectionId)
  })

  it('lists records by confidence and starts pending', () => {
    const saved = saveDetection({ latitude: 25, longitude: 68, approximate: true, areaGeojson: geometry, confidence: .91, summary: 'filterable', signs: [], productId: 'p3', productName: 'demo three', collection: 'SENTINEL-2', capturedAt: null, imagePath: null, model: 'test' })
    createdIds.push(saved.hotspotId)
    const result = listHotspots({ minConfidence: '.9', q: 'filterable' })
    expect(result.items.some((item) => item.id === saved.hotspotId)).toBe(true)
    expect(deriveStatus(saved.hotspotId)).toBe('pending')
  })
})
