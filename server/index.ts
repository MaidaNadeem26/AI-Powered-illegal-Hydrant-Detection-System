import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { z } from 'zod'
import exifr from 'exifr'
import { fetchProcessImage, searchCopernicus, validateSearchRequest, type SatelliteProduct } from './copernicus.js'
import { analyzeSatelliteImage } from './gemini.js'
import { toPotentialHotspot } from './hotspot.js'
import { addVerification, getHotspot, getStats, listHotspots, saveDetection, statuses, updateHotspot, type VerificationStatus } from './db.js'

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) })

const app = express()
const port = Number(process.env.PORT ?? 3001)

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(path.join(path.dirname(fileURLToPath(new URL('.', import.meta.url))), 'uploads'), { setHeaders: (response) => response.setHeader('X-Content-Type-Options', 'nosniff') }))

const upload = multer({ storage: multer.memoryStorage(), limits: { files: 6, fileSize: 8 * 1024 * 1024 } })
const writeLimit = new Map<string, { count: number; at: number }>()
function requireAdmin(request: express.Request, response: express.Response, next: express.NextFunction) {
  const token = process.env.ADMIN_TOKEN
  if (!token) return next()
  if (request.headers.authorization !== `Bearer ${token}`) return response.status(401).json({ error: 'Administrator authorization is required.' })
  next()
}
function rateLimit(request: express.Request, response: express.Response, next: express.NextFunction) {
  const key = request.ip ?? 'unknown'; const current = writeLimit.get(key) ?? { count: 0, at: Date.now() }
  if (Date.now() - current.at > 60_000) { current.count = 0; current.at = Date.now() }
  current.count += 1; writeLimit.set(key, current)
  if (current.count > 20) return response.status(429).json({ error: 'Too many write requests. Try again shortly.' })
  next()
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'satellite-pipeline' })
})

app.post('/api/satellite/search', async (request, response) => {
  try {
    const searchRequest = validateSearchRequest(request.body)
    const products = await searchCopernicus(searchRequest)
    response.json({ products })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Satellite search failed.'
    const status = message.includes('required') || message.includes('must') || message.includes('collection') ? 400 : 502
    response.status(status).json({ error: message })
  }
})

app.post('/api/satellite/analyze', async (request, response) => {
  try {
    const searchRequest = validateSearchRequest(request.body)
    const processImage = await fetchProcessImage(searchRequest)
    const satelliteProduct: SatelliteProduct = {
      id: `process-${searchRequest.startDate}-${searchRequest.endDate}`,
      name: `Sentinel-2 Process API true-color ${searchRequest.startDate} to ${searchRequest.endDate}`,
      collection: searchRequest.collection,
      startDate: searchRequest.startDate,
      endDate: searchRequest.endDate,
      downloadPath: null,
      quicklookUrl: null,
    }
    const analysis = await analyzeSatelliteImage(satelliteProduct, searchRequest.geometry, { dataUrl: processImage.dataUrl })
    const hotspot = toPotentialHotspot(searchRequest.geometry, satelliteProduct, analysis)
    let persistence = { saved: false }
    if (hotspot) {
      const uploadsDirectory = path.join(path.dirname(fileURLToPath(new URL('.', import.meta.url))), 'uploads', 'satellite')
      await mkdir(uploadsDirectory, { recursive: true })
      const filename = `${randomUUID()}.jpg`
      await writeFile(path.join(uploadsDirectory, filename), Buffer.from(processImage.dataUrl.split(',')[1], 'base64'))
      persistence = saveDetection({ latitude: hotspot.latitude, longitude: hotspot.longitude, approximate: analysis.latitude === null, areaGeojson: searchRequest.geometry, confidence: analysis.confidence, summary: analysis.summary, signs: analysis.signs, productId: satelliteProduct.id, productName: satelliteProduct.name, collection: satelliteProduct.collection, capturedAt: satelliteProduct.startDate, imagePath: `/uploads/satellite/${filename}`, model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash' })
    }
    response.json({ analysis, hotspot, product: satelliteProduct, image: { width: processImage.width, height: processImage.height, bytes: processImage.bytes }, ...persistence })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Satellite image analysis failed.'
    const status = message.includes('required') || message.includes('must') || message.includes('collection') ? 400 : 502
    response.status(status).json({ error: message })
  }
})

app.get('/api/hotspots', (request, response) => response.json(listHotspots(request.query as Record<string, string>)))
app.get('/api/hotspots/stats', (request, response) => response.json(getStats(request.query as Record<string, string>)))
app.get('/api/hotspots/export.csv', (request, response) => {
  const rows = listHotspots({ ...(request.query as Record<string, string>), page: '1', pageSize: '10000' }).items as Array<Record<string, unknown>>
  const escape = (value: unknown) => { const text = String(value ?? ''); const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe }
  const header = ['id', 'latitude', 'longitude', 'country', 'region', 'status', 'confidence', 'first detected', 'last detected', 'last verified at']
  const csv = [header, ...rows.map((row) => [row.id, row.latitude, row.longitude, row.country, row.region, row.status, row.latest_confidence, row.created_at, row.last_detected, row.last_verified_at])].map((row) => row.map(escape).join(',')).join('\n')
  response.setHeader('Content-Type', 'text/csv; charset=utf-8'); response.setHeader('Content-Disposition', 'attachment; filename="hotspots.csv"'); response.send(csv)
})
app.get('/api/hotspots/:id', (request, response) => { const result = getHotspot(request.params.id); if (!result) return response.status(404).json({ error: 'Hotspot not found.' }); response.json(result) })
app.patch('/api/hotspots/:id', requireAdmin, rateLimit, (request, response) => { const body = z.object({ country: z.string().max(120).nullable(), region: z.string().max(120).nullable() }).safeParse(request.body); if (!body.success) return response.status(400).json({ error: 'Only country and region are editable.' }); const result = updateHotspot(request.params.id, body.data.country, body.data.region); if (!result) return response.status(404).json({ error: 'Hotspot not found.' }); response.json(result) })

const verificationSchema = z.object({ status: z.enum(statuses), notes: z.string().max(2000).default(''), reviewer_name: z.string().min(1).max(120), visited_at: z.string().datetime().refine((value) => new Date(value) <= new Date(), 'visited_at cannot be in the future'), latitude: z.coerce.number().min(-90).max(90).nullable().optional(), longitude: z.coerce.number().min(-180).max(180).nullable().optional(), location_accuracy_m: z.coerce.number().positive().nullable().optional() })
app.post('/api/hotspots/:id/verifications', requireAdmin, rateLimit, upload.array('photos', 6) as unknown as express.RequestHandler, async (request, response) => {
  const parsed = verificationSchema.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid verification fields.' })
  const files = (request.files as Express.Multer.File[] | undefined) ?? []
  const evidenceDirectory = path.join(path.dirname(fileURLToPath(new URL('.', import.meta.url))), 'uploads', 'evidence'); await mkdir(evidenceDirectory, { recursive: true })
  const evidence: Array<{ filePath: string; mimeType: string; sizeBytes: number; takenAt: string | null; originalName: string }> = []
  for (const file of files) {
    const isJpeg = file.buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])); const isPng = file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])); const isWebp = file.buffer.subarray(0, 4).toString() === 'RIFF' && file.buffer.subarray(8, 12).toString() === 'WEBP'
    if (!isJpeg && !isPng && !isWebp) return response.status(400).json({ error: 'Photos must be valid JPEG, PNG, or WebP images.' })
    const extension = isJpeg ? 'jpg' : isPng ? 'png' : 'webp'; const filename = `${randomUUID()}.${extension}`; await writeFile(path.join(evidenceDirectory, filename), file.buffer); const metadata = isJpeg ? await exifr.parse(file.buffer, { tiff: true, exif: true, gps: true }) : null
    evidence.push({ filePath: `/uploads/evidence/${filename}`, mimeType: file.mimetype, sizeBytes: file.size, takenAt: metadata?.DateTimeOriginal?.toISOString?.() ?? null, originalName: file.originalname })
  }
  try { const result = addVerification({ hotspotId: request.params.id, status: parsed.data.status as VerificationStatus, notes: parsed.data.notes, reviewerName: parsed.data.reviewer_name, visitedAt: parsed.data.visited_at, latitude: parsed.data.latitude ?? null, longitude: parsed.data.longitude ?? null, accuracy: parsed.data.location_accuracy_m ?? null, evidence }); if (!result) return response.status(404).json({ error: 'Hotspot not found.' }); response.status(201).json(result) } catch { response.status(404).json({ error: 'Hotspot not found.' }) }
})

app.listen(port, () => {
  console.log(`Satellite pipeline API listening on http://localhost:${port}`)
})
