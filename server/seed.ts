import './db.js'
import { randomUUID } from 'node:crypto'
import { db, now } from './db.js'

const countries = ['Pakistan', 'Jordan', 'Kenya']
const regions = ['Sindh', 'Amman', 'Nairobi']
const statuses = ['pending', 'verified', 'unverified', 'further_investigation']
for (let index = 0; index < 15; index += 1) {
  const created = new Date(Date.now() - index * 86_400_000).toISOString()
  const id = randomUUID()
  db.prepare(`INSERT INTO hotspots (id, created_at, updated_at, latitude, longitude, location_is_approximate, area_geojson, country, region, latest_confidence, latest_summary, latest_signs, status, demo) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 1)`).run(id, created, now(), 24.86 + index * .01, 67.00 + index * .01, '{}', countries[index % 3], regions[index % 3], .45 + (index % 5) * .1, 'Demo screening result for dashboard review.', JSON.stringify(['Demo suspicious sign']), statuses[index % statuses.length])
  db.prepare(`INSERT INTO detections (id, hotspot_id, created_at, model, confidence, summary, signs, product_id, product_name, collection, captured_at, satellite_image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), id, created, 'gemini-3.6-flash', .45 + (index % 5) * .1, 'Demo screening result for dashboard review.', JSON.stringify(['Demo suspicious sign']), `demo-${index}`, 'Demo Sentinel-2 product', 'SENTINEL-2', created, null)
}
console.log('Inserted 15 demo hotspots.')
