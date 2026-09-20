const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
function analysisPrompt(product, geometry) {
    const ring = geometry.geometry.coordinates[0];
    const longitudes = ring.map(([longitude]) => longitude);
    const latitudes = ring.map(([, latitude]) => latitude);
    const bounds = `west=${Math.min(...longitudes)}, south=${Math.min(...latitudes)}, east=${Math.max(...longitudes)}, north=${Math.max(...latitudes)}`;
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
- This image is from ${product.collection} product ${product.name}, captured around ${product.startDate ?? 'an unknown date'}.`;
}
function parseAnalysis(content) {
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd <= jsonStart)
        throw new Error('Gemini returned no JSON analysis.');
    const value = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
    const confidence = Number(value.confidence);
    const latitude = value.latitude == null ? null : Number(value.latitude);
    const longitude = value.longitude == null ? null : Number(value.longitude);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)
        throw new Error('Gemini returned an invalid confidence score.');
    if ((latitude !== null && (latitude < -90 || latitude > 90)) || (longitude !== null && (longitude < -180 || longitude > 180))) {
        throw new Error('Gemini returned invalid hotspot coordinates.');
    }
    return {
        imageUsable: value.imageUsable === true,
        isPotentialWaterExtractionHotspot: value.isPotentialWaterExtractionHotspot === true,
        confidence,
        summary: typeof value.summary === 'string' ? value.summary : 'No summary returned.',
        signs: Array.isArray(value.signs) ? value.signs.filter((sign) => typeof sign === 'string').slice(0, 10) : [],
        latitude,
        longitude,
    };
}
async function imageToInlineData(image) {
    if (image.dataUrl) {
        const match = image.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match)
            throw new Error('imageDataUrl must be a valid base64 data URL.');
        return { mimeType: match[1], data: match[2] };
    }
    if (!image.url)
        throw new Error('An image URL or data URL is required for Gemini analysis.');
    if (!image.url.startsWith('https://'))
        throw new Error('imageUrl must use HTTPS.');
    const response = await fetch(image.url, { headers: { 'User-Agent': 'AI-Hydrant-Detection-System/1.0' } });
    if (!response.ok)
        throw new Error(`Satellite preview image returned HTTP ${response.status} for ${image.url}. Use a reachable image URL or imageDataUrl.`);
    const mimeType = response.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';
    if (!mimeType.startsWith('image/'))
        throw new Error('Satellite preview URL did not return an image.');
    const data = Buffer.from(await response.arrayBuffer()).toString('base64');
    return { mimeType, data };
}
export async function analyzeSatelliteImage(product, geometry, image) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error('GEMINI_API_KEY is not configured on the backend.');
    const imagePart = await imageToInlineData(image);
    const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    const endpoint = `${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: analysisPrompt(product, geometry) }, { inlineData: imagePart }] }],
            generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        let detail = errorBody;
        try {
            const parsed = JSON.parse(errorBody);
            detail = parsed.error?.message ?? errorBody;
        }
        catch {
            // Preserve the raw provider response when it is not JSON.
        }
        throw new Error(`Gemini API returned HTTP ${response.status}: ${detail}`);
    }
    const payload = (await response.json());
    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
    if (!content)
        throw new Error('Gemini returned an empty analysis.');
    return parseAnalysis(content);
}
