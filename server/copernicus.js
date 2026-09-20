import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const CATALOGUE_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products';
const TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const PROCESS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/process';
const TRUE_COLOR_EVALSCRIPT = `//VERSION=3
function setup(){return{input:["B04","B03","B02"],output:{bands:3}}}
function evaluatePixel(s){return [2.5*s.B04,2.5*s.B03,2.5*s.B02]}`;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
async function getCopernicusToken() {
    if (process.env.CDSE_ACCESS_TOKEN)
        return process.env.CDSE_ACCESS_TOKEN;
    const username = process.env.CDSE_USERNAME;
    const password = process.env.CDSE_PASSWORD;
    if (username && password) {
        const body = new URLSearchParams({ grant_type: 'password', client_id: 'cdse-public', username, password });
        const response = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        if (!response.ok)
            throw new Error(`Copernicus user authentication returned HTTP ${response.status}. Check CDSE_USERNAME and CDSE_PASSWORD.`);
        const payload = await response.json();
        if (!payload.access_token)
            throw new Error('Copernicus user authentication returned no access token.');
        return payload.access_token;
    }
    const clientId = process.env.CDSE_CLIENT_ID;
    const clientSecret = process.env.CDSE_CLIENT_SECRET;
    if (!clientId || !clientSecret)
        return null;
    const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });
    const response = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!response.ok)
        throw new Error(`Copernicus authentication returned HTTP ${response.status}.`);
    const payload = await response.json();
    if (!payload.access_token)
        throw new Error('Copernicus authentication returned no access token.');
    return payload.access_token;
}
export async function fetchProcessImage(request) {
    const token = await getCopernicusToken();
    if (!token)
        throw new Error('Copernicus Process API access requires CDSE_ACCESS_TOKEN or CDSE_USERNAME/CDSE_PASSWORD in server/.env.');
    const [west, south, east, north] = boundingBox(request.geometry);
    const initial = processDimensions(west, south, east, north);
    let width = initial.width;
    let height = initial.height;
    let image = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        const response = await fetch(PROCESS_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: {
                    bounds: { bbox: [west, south, east, north], properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
                    data: [{ type: 'sentinel-2-l2a', dataFilter: { timeRange: { from: `${request.startDate}T00:00:00Z`, to: `${request.endDate}T23:59:59Z` }, mosaickingOrder: 'leastCC', maxCloudCoverage: 30 } }],
                },
                output: { width, height, responses: [{ identifier: 'default', format: { type: 'image/jpeg' } }] },
                evalscript: TRUE_COLOR_EVALSCRIPT,
            }),
        });
        if (!response.ok) {
            const detail = await response.text();
            throw new Error(`Copernicus Process API returned HTTP ${response.status}: ${detail.slice(0, 500)}`);
        }
        image = Buffer.from(await response.arrayBuffer());
        if (image.byteLength <= MAX_IMAGE_BYTES)
            break;
        width = Math.max(1, Math.floor(width * 0.7));
        height = Math.max(1, Math.floor(height * 0.7));
    }
    if (!image || image.byteLength > MAX_IMAGE_BYTES)
        throw new Error('Copernicus Process API image could not be kept under 4 MB.');
    const debugDirectory = fileURLToPath(new URL('./debug/', import.meta.url));
    await mkdir(debugDirectory, { recursive: true });
    await writeFile(path.join(debugDirectory, 'last.jpg'), image);
    return { dataUrl: `data:image/jpeg;base64,${image.toString('base64')}`, width, height, bytes: image.byteLength };
}
function boundingBox(geometry) {
    const coordinates = geometry.geometry.coordinates[0];
    const longitudes = coordinates.map(([longitude]) => longitude);
    const latitudes = coordinates.map(([, latitude]) => latitude);
    return [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)];
}
function processDimensions(west, south, east, north) {
    const metersPerDegree = 111_320;
    const latitude = ((south + north) / 2) * Math.PI / 180;
    const rawWidth = Math.max(1, Math.round((east - west) * metersPerDegree * Math.cos(latitude) / 10));
    const rawHeight = Math.max(1, Math.round((north - south) * metersPerDegree / 10));
    const scale = Math.min(1, 1024 / Math.max(rawWidth, rawHeight));
    return { width: Math.max(1, Math.floor(rawWidth * scale)), height: Math.max(1, Math.floor(rawHeight * scale)) };
}
function polygonWkt(geometry) {
    const ring = geometry.geometry.coordinates[0];
    const coordinates = ring.map(([longitude, latitude]) => `${longitude} ${latitude}`).join(', ');
    return `POLYGON ((${coordinates}))`;
}
function isDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}
export function validateSearchRequest(value) {
    const request = value;
    if (!request?.geometry || request.geometry.type !== 'Feature' || request.geometry.geometry?.type !== 'Polygon')
        throw new Error('A Polygon GeoJSON feature is required.');
    if (!isDate(request.startDate ?? '') || !isDate(request.endDate ?? ''))
        throw new Error('startDate and endDate must use YYYY-MM-DD format.');
    const startDate = request.startDate;
    const endDate = request.endDate;
    if (!startDate || !endDate)
        throw new Error('startDate and endDate are required.');
    if (startDate > endDate)
        throw new Error('startDate must be before endDate.');
    if (request.collection !== 'SENTINEL-1' && request.collection !== 'SENTINEL-2')
        throw new Error('collection must be SENTINEL-1 or SENTINEL-2.');
    return request;
}
export async function searchCopernicus(request) {
    const filter = [`Collection/Name eq '${request.collection}'`, `OData.CSC.Intersects(area=geography'SRID=4326;${polygonWkt(request.geometry)}')`, `ContentDate/Start ge ${request.startDate}T00:00:00.000Z`, `ContentDate/Start le ${request.endDate}T23:59:59.999Z`].join(' and ');
    const url = new URL(CATALOGUE_URL);
    url.searchParams.set('$filter', filter);
    url.searchParams.set('$orderby', 'ContentDate/Start desc');
    url.searchParams.set('$top', '20');
    url.searchParams.set('$expand', 'Assets');
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Copernicus catalogue returned HTTP ${response.status}.`);
    const payload = await response.json();
    return (payload.value ?? []).map((product) => ({ id: product.Id, name: product.Name, collection: request.collection, startDate: product.ContentDate?.Start ?? null, endDate: product.ContentDate?.End ?? null, downloadPath: product.S3Path ?? null, quicklookUrl: product.Assets?.[0]?.DownloadLink ?? product.Assets?.[0]?.DownloadUrl ?? null }));
}
