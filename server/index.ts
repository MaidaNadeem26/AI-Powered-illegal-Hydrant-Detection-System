import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import { fetchProcessImage, searchCopernicus, validateSearchRequest, type SatelliteProduct } from './copernicus.js'
import { analyzeSatelliteImage } from './gemini.js'
import { toPotentialHotspot } from './hotspot.js'

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) })

const app = express()
const port = Number(process.env.PORT ?? 3001)

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

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
    response.json({ analysis, hotspot: toPotentialHotspot(searchRequest.geometry, satelliteProduct, analysis), product: satelliteProduct, image: { width: processImage.width, height: processImage.height, bytes: processImage.bytes } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Satellite image analysis failed.'
    const status = message.includes('required') || message.includes('must') || message.includes('collection') ? 400 : 502
    response.status(status).json({ error: message })
  }
})

app.listen(port, () => {
  console.log(`Satellite pipeline API listening on http://localhost:${port}`)
})
