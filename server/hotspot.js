function polygonCenter(geometry) {
    const ring = geometry.geometry.coordinates[0];
    const points = ring.slice(0, -1);
    if (points.length === 0)
        throw new Error('The selected polygon has no coordinates.');
    const longitude = points.reduce((sum, [value]) => sum + value, 0) / points.length;
    const latitude = points.reduce((sum, [, value]) => sum + value, 0) / points.length;
    return { latitude, longitude };
}
export function toPotentialHotspot(geometry, product, analysis) {
    if (!analysis.imageUsable || !analysis.isPotentialWaterExtractionHotspot)
        return null;
    const center = polygonCenter(geometry);
    return {
        id: `hotspot-${product.id}`,
        label: 'Potential Water Extraction Hotspot',
        latitude: analysis.latitude ?? center.latitude,
        longitude: analysis.longitude ?? center.longitude,
        confidence: analysis.confidence,
        summary: analysis.summary,
        signs: analysis.signs,
        source: {
            productId: product.id,
            productName: product.name,
            collection: product.collection,
            capturedAt: product.startDate,
        },
    };
}
