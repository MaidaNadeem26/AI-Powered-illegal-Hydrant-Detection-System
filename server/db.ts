import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.join(serverDirectory, 'data')
await mkdir(dataDirectory, { recursive: true })

export const db = new Database(path.join(dataDirectory, 'app.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS hotspots (
    id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    latitude REAL NOT NULL, longitude REAL NOT NULL, location_is_approximate INTEGER NOT NULL DEFAULT 1,
    area_geojson TEXT NOT NULL, country TEXT, region TEXT, latest_confidence REAL NOT NULL,
    latest_summary TEXT NOT NULL, latest_signs TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', demo INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS detections (
    id TEXT PRIMARY KEY, hotspot_id TEXT NOT NULL REFERENCES hotspots(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL, model TEXT NOT NULL, confidence REAL NOT NULL, summary TEXT NOT NULL,
    signs TEXT NOT NULL, product_id TEXT NOT NULL, product_name TEXT NOT NULL, collection TEXT NOT NULL,
    captured_at TEXT, satellite_image_path TEXT
  );
  CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY, hotspot_id TEXT NOT NULL REFERENCES hotspots(id) ON DELETE CASCADE,
    status TEXT NOT NULL, notes TEXT NOT NULL, reviewer_name TEXT NOT NULL, visited_at TEXT NOT NULL,
    latitude REAL, longitude REAL, location_accuracy_m REAL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY, verification_id TEXT NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
    taken_at TEXT, original_name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS geocache (latitude REAL NOT NULL, longitude REAL NOT NULL, country TEXT, region TEXT, created_at TEXT NOT NULL, PRIMARY KEY(latitude, longitude));
  CREATE INDEX IF NOT EXISTS idx_hotspots_status ON hotspots(status);
  CREATE INDEX IF NOT EXISTS idx_hotspots_confidence ON hotspots(latest_confidence);
  CREATE INDEX IF NOT EXISTS idx_detections_hotspot ON detections(hotspot_id);
  CREATE INDEX IF NOT EXISTS idx_verifications_hotspot ON verifications(hotspot_id);
`)

export const now = () => new Date().toISOString()
export const statuses = ['verified', 'unverified', 'further_investigation'] as const
export type VerificationStatus = typeof statuses[number]

export function deriveStatus(hotspotId: string) {
  const row = db.prepare('SELECT status FROM verifications WHERE hotspot_id = ? ORDER BY created_at DESC LIMIT 1').get(hotspotId) as { status?: VerificationStatus } | undefined
  return row?.status ?? 'pending'
}

function parseHotspot(row: Record<string, unknown>) {
  return { ...row, location_is_approximate: Boolean(row.location_is_approximate), latest_signs: JSON.parse(String(row.latest_signs)) }
}

export function saveDetection(input: { latitude: number; longitude: number; approximate: boolean; areaGeojson: unknown; confidence: number; summary: string; signs: string[]; productId: string; productName: string; collection: string; capturedAt: string | null; imagePath: string | null; model: string }) {
  const timestamp = now()
  const nearby = db.prepare(`SELECT * FROM hotspots WHERE ((latitude - ?) * 111320) * ((latitude - ?) * 111320) + ((longitude - ?) * 111320 * cos(radians(latitude)) * (longitude - ?) * 111320 * cos(radians(latitude))) <= ?`).get(input.latitude, input.latitude, input.longitude, input.longitude, 300 * 300) as Record<string, unknown> | undefined
  const hotspotId = String(nearby?.id ?? randomUUID())
  const detectionId = randomUUID()
  const transaction = db.transaction(() => {
    if (nearby) {
      db.prepare(`UPDATE hotspots SET updated_at = ?, latitude = ?, longitude = ?, location_is_approximate = ?, area_geojson = ?, latest_confidence = ?, latest_summary = ?, latest_signs = ? WHERE id = ?`).run(timestamp, input.latitude, input.longitude, input.approximate ? 1 : 0, JSON.stringify(input.areaGeojson), input.confidence, input.summary, JSON.stringify(input.signs), hotspotId)
    } else {
      db.prepare(`INSERT INTO hotspots (id, created_at, updated_at, latitude, longitude, location_is_approximate, area_geojson, latest_confidence, latest_summary, latest_signs, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`).run(hotspotId, timestamp, timestamp, input.latitude, input.longitude, input.approximate ? 1 : 0, JSON.stringify(input.areaGeojson), input.confidence, input.summary, JSON.stringify(input.signs))
    }
    db.prepare(`INSERT INTO detections (id, hotspot_id, created_at, model, confidence, summary, signs, product_id, product_name, collection, captured_at, satellite_image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(detectionId, hotspotId, timestamp, input.model, input.confidence, input.summary, JSON.stringify(input.signs), input.productId, input.productName, input.collection, input.capturedAt, input.imagePath)
  })
  transaction()
  return { hotspotId, detectionId, saved: true }
}

export function listHotspots(filters: Record<string, string | undefined>) {
  const where: string[] = []
  const values: unknown[] = []
  if (filters.country) { where.push('h.country = ?'); values.push(filters.country) }
  if (filters.region) { where.push('h.region = ?'); values.push(filters.region) }
  if (filters.status) { where.push('h.status = ?'); values.push(filters.status) }
  if (filters.from) { where.push('h.created_at >= ?'); values.push(filters.from) }
  if (filters.to) { where.push('h.created_at <= ?'); values.push(filters.to) }
  if (filters.minConfidence) { where.push('h.latest_confidence >= ?'); values.push(Number(filters.minConfidence)) }
  if (filters.q) { where.push('(h.country LIKE ? OR h.region LIKE ? OR h.latest_summary LIKE ?)'); values.push(`%${filters.q}%`, `%${filters.q}%`, `%${filters.q}%`) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const order = filters.sort === 'confidence' ? 'h.latest_confidence DESC' : filters.sort === 'status' ? 'h.status ASC, h.updated_at DESC' : 'h.updated_at DESC'
  const total = (db.prepare(`SELECT COUNT(*) count FROM hotspots h ${clause}`).get(...values) as { count: number }).count
  const page = Math.max(1, Number(filters.page ?? 1)); const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize ?? 20)))
  const rows = db.prepare(`SELECT h.*, (SELECT COUNT(*) FROM detections d WHERE d.hotspot_id = h.id) detection_count, (SELECT MAX(created_at) FROM detections d WHERE d.hotspot_id = h.id) last_detected, (SELECT MAX(created_at) FROM verifications v WHERE v.hotspot_id = h.id) last_verified_at FROM hotspots h ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...values, pageSize, (page - 1) * pageSize) as Record<string, unknown>[]
  return { items: rows.map(parseHotspot), total, page, pageSize }
}

export function getStats(filters: Record<string, string | undefined>) {
  const items = listHotspots({ ...filters, page: '1', pageSize: '10000' }).items as Array<Record<string, unknown>>
  const counts = Object.fromEntries(['pending', ...statuses].map((status) => [status, items.filter((item) => item.status === status).length]))
  return { counts, countries: [...new Set(items.map((item) => item.country).filter(Boolean))], regions: [...new Set(items.map((item) => item.region).filter(Boolean))] }
}

export function getHotspot(id: string) {
  const row = db.prepare('SELECT * FROM hotspots WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) return null
  const detections = db.prepare('SELECT * FROM detections WHERE hotspot_id = ? ORDER BY created_at DESC').all(id) as Array<Record<string, unknown>>
  const verifications = db.prepare('SELECT * FROM verifications WHERE hotspot_id = ? ORDER BY created_at DESC').all(id) as Array<Record<string, unknown>>
  return { hotspot: parseHotspot(row), detections: detections.map((d) => ({ ...d, signs: JSON.parse(String((d as Record<string, unknown>).signs)) })), verifications: verifications.map((v) => ({ ...v, evidence: db.prepare('SELECT * FROM evidence WHERE verification_id = ?').all(v.id) })) }
}

export function updateHotspot(id: string, country: string | null, region: string | null) { db.prepare('UPDATE hotspots SET country = ?, region = ?, updated_at = ? WHERE id = ?').run(country, region, now(), id); return getHotspot(id) }

export function addVerification(input: { hotspotId: string; status: VerificationStatus; notes: string; reviewerName: string; visitedAt: string; latitude: number | null; longitude: number | null; accuracy: number | null; evidence: Array<{ filePath: string; mimeType: string; sizeBytes: number; takenAt: string | null; originalName: string }> }) {
  const id = randomUUID(); const timestamp = now()
  const transaction = db.transaction(() => { db.prepare(`INSERT INTO verifications (id, hotspot_id, status, notes, reviewer_name, visited_at, latitude, longitude, location_accuracy_m, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.hotspotId, input.status, input.notes, input.reviewerName, input.visitedAt, input.latitude, input.longitude, input.accuracy, timestamp); const statement = db.prepare('INSERT INTO evidence (id, verification_id, file_path, mime_type, size_bytes, taken_at, original_name) VALUES (?, ?, ?, ?, ?, ?, ?)'); for (const item of input.evidence) statement.run(randomUUID(), id, item.filePath, item.mimeType, item.sizeBytes, item.takenAt, item.originalName); db.prepare('UPDATE hotspots SET status = ?, updated_at = ? WHERE id = ?').run(input.status, timestamp, input.hotspotId) })
  transaction(); return getHotspot(input.hotspotId)
}
