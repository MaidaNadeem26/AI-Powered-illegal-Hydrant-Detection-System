import type { Feature, Polygon } from 'geojson'
import type { SatelliteProduct } from './copernicus.js'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'

export interface HotspotAnalysis {
  imageUsable: boolean
  isPotentialWaterExtractionHotspot: boolean
  confidence: number
  summary: string
  signs: string[]
  latitude: number | null
  longitude: number | null
  usedModel?: string
}

function analysisPrompt(product: SatelliteProduct, geometry: Feature<Polygon>) {
  const ring = geometry.geometry.coordinates[0]
  const longitudes = ring.map(([longitude]) => longitude)
  const latitudes = ring.map(([, latitude]) => latitude)
  const bounds = `west=${Math.min(...longitudes)}, south=${Math.min(...latitudes)}, east=${Math.max(...longitudes)}, north=${Math.max(...latitudes)}`
  return `You are a remote-sensing analyst supporting a civic water-infrastructure review.

Inspect the supplied satellite image and return ONLY valid JSON matching this schema:
{"imageUsable":boolean,"isPotentialWaterExtractionHotspot":boolean,"confidence":number,"summary":string,"signs":string[],"latitude":number|null,"longitude":number|null}

Rules:
- Look for visible water-related infrastructure or suspicious water-extraction signs: ponds or reservoirs, irrigation channels, pumping areas, tanks, pipes, disturbed soil around water access, or unusually dense vegetation suggesting irrigation.
- Do not claim certainty, illegality, ownership, or criminal activity from imagery alone. Use cautious language and mark uncertain cases false or low confidence.
- confidence must be between 0 and 1.
- Only return latitude/longitude if the image metadata or visible context supports a location; otherwise return null.
- Keep signs concise and evidence-based.
- Set imageUsable=false when the image is blank, mostly black/nodata, severely blurry, lacks visible land, or cannot support a reliable visual conclusion. If imageUsable=false, set isPotentialWaterExtractionHotspot=false, confidence=0, signs=[], latitude=null, longitude=null.
- The user-selected area is the GeoJSON bounding box ${bounds}. Focus your assessment on that area. The supplied quicklook may show a larger Sentinel tile, so do not use evidence outside the selected area.
- This image is from ${product.collection} product ${product.name}, captured around ${product.startDate ?? 'an unknown date'}.`
}

function parseAnalysis(content: string): HotspotAnalysis {
  const jsonStart = content.indexOf('{')
  const jsonEnd = content.lastIndexOf('}')
  if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error('Gemini returned no JSON analysis.')
  const value = JSON.parse(content.slice(jsonStart, jsonEnd + 1)) as Partial<HotspotAnalysis>
  const confidence = Number(value.confidence)
  const latitude = value.latitude == null ? null : Number(value.latitude)
  const longitude = value.longitude == null ? null : Number(value.longitude)
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('Gemini returned an invalid confidence score.')
  if ((latitude !== null && (latitude < -90 || latitude > 90)) || (longitude !== null && (longitude < -180 || longitude > 180))) {
    throw new Error('Gemini returned invalid hotspot coordinates.')
  }
  return {
    imageUsable: value.imageUsable === true,
    isPotentialWaterExtractionHotspot: value.isPotentialWaterExtractionHotspot === true,
    confidence,
    summary: typeof value.summary === 'string' ? value.summary : 'No summary returned.',
    signs: Array.isArray(value.signs) ? value.signs.filter((sign): sign is string => typeof sign === 'string').slice(0, 10) : [],
    latitude,
    longitude,
  }
}

async function imageToInlineData(image: { url?: string; dataUrl?: string }) {
  if (image.dataUrl) {
    const match = image.dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) throw new Error('imageDataUrl must be a valid base64 data URL.')
    return { mimeType: match[1], data: match[2] }
  }
  if (!image.url) throw new Error('An image URL or data URL is required for Gemini analysis.')
  if (!image.url.startsWith('https://')) throw new Error('imageUrl must use HTTPS.')

  const response = await fetch(image.url, { headers: { 'User-Agent': 'AI-Hydrant-Detection-System/1.0' } })
  if (!response.ok) throw new Error(`Satellite preview image returned HTTP ${response.status} for ${image.url}. Use a reachable image URL or imageDataUrl.`)
  const mimeType = response.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg'
  if (!mimeType.startsWith('image/')) throw new Error('Satellite preview URL did not return an image.')
  const data = Buffer.from(await response.arrayBuffer()).toString('base64')
  return { mimeType, data }
}

export async function analyzeSatelliteImage(product: SatelliteProduct, geometry: Feature<Polygon>, image: { url?: string; dataUrl?: string }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the backend.')
  const imagePart = await imageToInlineData(image)
  let targetModel = (process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL)
  if (targetModel.startsWith('models/')) {
    targetModel = targetModel.slice('models/'.length)
  }
  if (targetModel === 'gemini-2.0-flash-lite' || targetModel === 'gemini-2.5-flash-lite') {
    targetModel = 'gemini-3.5-flash-lite'
  }
  if (targetModel === 'gemini-2.5-flash') {
    targetModel = 'gemini-3.6-flash'
  }

  const candidateModels = Array.from(new Set([
    targetModel,
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
  ]))

  const MAX_ROUNDS = 2
  let lastError: Error | null = null

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    for (const model of candidateModels) {
      try {
        const endpoint = `${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: analysisPrompt(product, geometry) }, { inlineData: imagePart }] }],
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
          }),
        })

        if (!response.ok) {
          const errorBody = await response.text()
          let detail = errorBody
          try {
            const parsed = JSON.parse(errorBody) as { error?: { message?: string } }
            detail = parsed.error?.message ?? errorBody
          } catch {
            // Preserve raw response
          }
          console.warn(`[gemini] Round ${round}: Model ${model} returned HTTP ${response.status} (${detail}). Trying next model...`)
          lastError = new Error(`Gemini API returned HTTP ${response.status} for ${model}: ${detail}`)
          continue
        }

        const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
        const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('')
        if (!content || !content.trim()) {
          console.warn(`[gemini] Round ${round}: Model ${model} returned empty content. Trying next model...`)
          lastError = new Error(`Gemini model ${model} returned empty response.`)
          continue
        }

        try {
          const analysis = parseAnalysis(content)
          console.log(`[gemini] Successfully received valid analysis using model ${model} in round ${round}.`)
          return { ...analysis, usedModel: model }
        } catch (parseErr) {
          const parseMsg = parseErr instanceof Error ? parseErr.message : 'JSON parse failed'
          console.warn(`[gemini] Round ${round}: Model ${model} returned unparseable analysis: ${parseMsg}. Trying next model...`)
          lastError = new Error(`Gemini model ${model} parse error: ${parseMsg}`)
          continue
        }
      } catch (networkErr) {
        const netMsg = networkErr instanceof Error ? networkErr.message : 'Network error'
        console.warn(`[gemini] Round ${round}: Error connecting to model ${model}: ${netMsg}. Trying next model...`)
        lastError = new Error(`Network error for model ${model}: ${netMsg}`)
        continue
      }
    }

    if (round < MAX_ROUNDS) {
      console.warn(`[gemini] Round ${round} completed without success. Waiting 1.2s before retrying all models...`)
      await new Promise((resolve) => setTimeout(resolve, 1200))
    }
  }

  throw lastError ?? new Error('Gemini analysis failed across all models and retry rounds.')
}
