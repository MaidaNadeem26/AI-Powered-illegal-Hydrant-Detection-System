import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(serverDirectory, 'data');
if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
}
const dataFilePath = path.join(dataDirectory, 'app.json');

export const now = () => new Date().toISOString();
export const statuses = ['verified', 'unverified', 'further_investigation'];

function getInitialData() {
    const data = {
        hotspots: [],
        detections: [],
        verifications: [],
        evidence: [],
    };
    const countries = ['Pakistan', 'Jordan', 'Kenya'];
    const regions = ['Sindh', 'Amman', 'Nairobi'];
    const statusList = ['pending', 'verified', 'unverified', 'further_investigation'];
    for (let index = 0; index < 15; index += 1) {
        const created = new Date(Date.now() - index * 86400000).toISOString();
        const id = randomUUID();
        const conf = Math.round((0.45 + (index % 5) * 0.1) * 100) / 100;
        const st = statusList[index % statusList.length];
        data.hotspots.push({
            id,
            created_at: created,
            updated_at: now(),
            latitude: 24.86 + index * 0.01,
            longitude: 67.0 + index * 0.01,
            location_is_approximate: true,
            area_geojson: {},
            country: countries[index % 3],
            region: regions[index % 3],
            latest_confidence: conf,
            latest_summary: 'Screening anomaly flagged in urban infrastructure sector.',
            latest_signs: ['Surface reservoir signature', 'Booster manifold loop', 'Heavy vehicle rut tracks'],
            status: st,
            demo: 1,
        });
        data.detections.push({
            id: randomUUID(),
            hotspot_id: id,
            created_at: created,
            model: 'gemini-3.6-flash',
            confidence: conf,
            summary: 'Screening anomaly flagged in urban infrastructure sector.',
            signs: ['Surface reservoir signature', 'Booster manifold loop'],
            product_id: `S2A_MSIL2A_202609${String(index + 1).padStart(2, '0')}`,
            product_name: `Sentinel-2 MSI Level-2A Sector ${index + 1}`,
            collection: 'SENTINEL-2',
            captured_at: created,
            satellite_image_path: '/images/satellite-detection.jpg',
        });
    }
    return data;
}

function loadData() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const raw = fs.readFileSync(dataFilePath, 'utf-8');
            return JSON.parse(raw);
        }
    }
    catch (error) {
        console.error('Failed to parse app.json, initializing fresh store:', error);
    }
    const initial = getInitialData();
    saveData(initial);
    return initial;
}

function saveData(data) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    }
    catch (error) {
        console.error('Failed to write app.json:', error);
    }
}

let appData = loadData();

function distanceMeters(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos((lat1 * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
}

export function deriveStatus(hotspotId) {
    const vers = appData.verifications
        .filter((v) => v.hotspot_id === hotspotId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return vers[0]?.status ?? 'pending';
}

export function saveDetection(input) {
    const timestamp = now();
    const nearby = appData.hotspots.find((h) => distanceMeters(input.latitude, input.longitude, h.latitude, h.longitude) <= 300);
    const hotspotId = nearby?.id ?? randomUUID();
    const detectionId = randomUUID();
    if (nearby) {
        nearby.updated_at = timestamp;
        nearby.latitude = input.latitude;
        nearby.longitude = input.longitude;
        nearby.location_is_approximate = input.approximate;
        nearby.area_geojson = input.areaGeojson;
        nearby.latest_confidence = input.confidence;
        nearby.latest_summary = input.summary;
        nearby.latest_signs = input.signs;
    }
    else {
        appData.hotspots.push({
            id: hotspotId,
            created_at: timestamp,
            updated_at: timestamp,
            latitude: input.latitude,
            longitude: input.longitude,
            location_is_approximate: input.approximate,
            area_geojson: input.areaGeojson,
            country: null,
            region: null,
            latest_confidence: input.confidence,
            latest_summary: input.summary,
            latest_signs: input.signs,
            status: 'pending',
            demo: 0,
        });
    }
    appData.detections.push({
        id: detectionId,
        hotspot_id: hotspotId,
        created_at: timestamp,
        model: input.model,
        confidence: input.confidence,
        summary: input.summary,
        signs: input.signs,
        product_id: input.productId,
        product_name: input.productName,
        collection: input.collection,
        captured_at: input.capturedAt,
        satellite_image_path: input.imagePath,
    });
    saveData(appData);
    return { hotspotId, detectionId, saved: true };
}

export function listHotspots(filters) {
    let list = [...appData.hotspots];
    if (filters.country) {
        list = list.filter((h) => h.country?.toLowerCase() === filters.country?.toLowerCase());
    }
    if (filters.region) {
        list = list.filter((h) => h.region?.toLowerCase() === filters.region?.toLowerCase());
    }
    if (filters.status) {
        list = list.filter((h) => h.status === filters.status);
    }
    if (filters.from) {
        list = list.filter((h) => h.created_at >= (filters.from ?? ''));
    }
    if (filters.to) {
        list = list.filter((h) => h.created_at <= (filters.to ?? ''));
    }
    if (filters.minConfidence) {
        const min = Number(filters.minConfidence);
        list = list.filter((h) => h.latest_confidence >= min);
    }
    if (filters.q) {
        const q = filters.q.toLowerCase();
        list = list.filter((h) => h.country?.toLowerCase().includes(q) ||
            h.region?.toLowerCase().includes(q) ||
            h.latest_summary.toLowerCase().includes(q));
    }
    if (filters.sort === 'confidence') {
        list.sort((a, b) => b.latest_confidence - a.latest_confidence);
    }
    else if (filters.sort === 'status') {
        list.sort((a, b) => a.status.localeCompare(b.status) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    else {
        list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    const total = list.length;
    const page = Math.max(1, Number(filters.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize ?? 20)));
    const offset = (page - 1) * pageSize;
    const paged = list.slice(offset, offset + pageSize);
    const items = paged.map((h) => {
        const hotspotDetections = appData.detections.filter((d) => d.hotspot_id === h.id);
        const hotspotVerifications = appData.verifications.filter((v) => v.hotspot_id === h.id);
        const lastDetected = hotspotDetections
            .map((d) => d.created_at)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
        const lastVerified = hotspotVerifications
            .map((v) => v.created_at)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
        return {
            ...h,
            detection_count: hotspotDetections.length,
            last_detected: lastDetected,
            last_verified_at: lastVerified,
        };
    });
    return { items, total, page, pageSize };
}

export function getStats(filters) {
    const items = listHotspots({ ...filters, page: '1', pageSize: '10000' }).items;
    const counts = Object.fromEntries(['pending', ...statuses].map((st) => [st, items.filter((item) => item.status === st).length]));
    return {
        counts,
        countries: [...new Set(items.map((item) => item.country).filter(Boolean))],
        regions: [...new Set(items.map((item) => item.region).filter(Boolean))],
    };
}

export function getHotspot(id) {
    const hotspot = appData.hotspots.find((h) => h.id === id);
    if (!hotspot)
        return null;
    const detections = appData.detections
        .filter((d) => d.hotspot_id === id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const verifications = appData.verifications
        .filter((v) => v.hotspot_id === id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((v) => ({
        ...v,
        evidence: appData.evidence.filter((e) => e.verification_id === v.id),
    }));
    const hotspotDetections = detections;
    const lastDetected = hotspotDetections
        .map((d) => d.created_at)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    const lastVerified = verifications
        .map((v) => v.created_at)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    return {
        hotspot: {
            ...hotspot,
            detection_count: detections.length,
            last_detected: lastDetected,
            last_verified_at: lastVerified,
        },
        detections,
        verifications,
    };
}

export function updateHotspot(id, country, region) {
    const hotspot = appData.hotspots.find((h) => h.id === id);
    if (!hotspot)
        return null;
    hotspot.country = country;
    hotspot.region = region;
    hotspot.updated_at = now();
    saveData(appData);
    return getHotspot(id);
}

export function addVerification(input) {
    const hotspot = appData.hotspots.find((h) => h.id === input.hotspotId);
    if (!hotspot)
        return null;
    const id = randomUUID();
    const timestamp = now();
    appData.verifications.push({
        id,
        hotspot_id: input.hotspotId,
        status: input.status,
        notes: input.notes,
        reviewer_name: input.reviewerName,
        visited_at: input.visitedAt,
        latitude: input.latitude,
        longitude: input.longitude,
        location_accuracy_m: input.accuracy,
        created_at: timestamp,
    });
    for (const item of input.evidence) {
        appData.evidence.push({
            id: randomUUID(),
            verification_id: id,
            file_path: item.filePath,
            mime_type: item.mimeType,
            size_bytes: item.sizeBytes,
            taken_at: item.takenAt,
            original_name: item.originalName,
        });
    }
    hotspot.status = input.status;
    hotspot.updated_at = timestamp;
    saveData(appData);
    return getHotspot(input.hotspotId);
}
