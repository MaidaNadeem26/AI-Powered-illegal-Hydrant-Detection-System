import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { searchCopernicus, validateSearchRequest } from './copernicus.js'

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

app.listen(port, () => {
  console.log(`Satellite pipeline API listening on http://localhost:${port}`)
})
