/**
 * Motor GPX reutilizable para Los Tresmiles de Iñaki.
 * Lee tracks/rutas GPX, normaliza puntos y calcula métricas cartográficas.
 */
const EARTH_RADIUS_KM = 6371.0088;

function localElements(root, name) {
  return [...root.getElementsByTagNameNS("*", name)];
}

function toFinite(value, fallback = NaN) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function haversineKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function parsePoint(node) {
  const eleNode = localElements(node, "ele")[0];
  const timeNode = localElements(node, "time")[0];
  const lat = toFinite(node.getAttribute("lat"));
  const lon = toFinite(node.getAttribute("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    lat,
    lon,
    ele: eleNode ? toFinite(eleNode.textContent) : NaN,
    time: timeNode?.textContent?.trim() || ""
  };
}

function parseSegments(xml) {
  const trackSegments = localElements(xml, "trkseg")
    .map((segment) => localElements(segment, "trkpt").map(parsePoint).filter(Boolean))
    .filter((segment) => segment.length > 1);
  if (trackSegments.length) return trackSegments;

  const route = localElements(xml, "rtept").map(parsePoint).filter(Boolean);
  return route.length > 1 ? [route] : [];
}

function flattenSegments(segments) {
  const points = [];
  let distanceKm = 0;
  segments.forEach((segment, segmentIndex) => {
    segment.forEach((point, pointIndex) => {
      const previous = points[points.length - 1];
      // No se suma una línea artificial entre dos segmentos independientes.
      if (previous && pointIndex > 0) distanceKm += haversineKm(previous, point);
      points.push({ ...point, distance: distanceKm, segmentIndex, pointIndex });
    });
  });
  return points;
}

function median(values) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return NaN;
  const middle = Math.floor(finite.length / 2);
  return finite.length % 2 ? finite[middle] : (finite[middle - 1] + finite[middle]) / 2;
}

function smoothElevations(points, radius = 3) {
  return points.map((point, index) => {
    if (!Number.isFinite(point.ele)) return NaN;
    const start = Math.max(0, index - radius);
    const end = Math.min(points.length, index + radius + 1);
    return median(points.slice(start, end).map((item) => item.ele));
  });
}

function elevationMetrics(points) {
  const elevations = points.map((point) => point.ele).filter(Number.isFinite);
  if (!elevations.length) {
    return { elevationGain: NaN, elevationLoss: NaN, minElevation: NaN, maxElevation: NaN, highestPointKm: NaN };
  }

  const smoothed = smoothElevations(points);
  let gain = 0;
  let loss = 0;
  const noiseThreshold = 1.5;
  for (let index = 1; index < smoothed.length; index += 1) {
    if (!Number.isFinite(smoothed[index - 1]) || !Number.isFinite(smoothed[index])) continue;
    const delta = smoothed[index] - smoothed[index - 1];
    if (Math.abs(delta) < noiseThreshold) continue;
    if (delta > 0) gain += delta;
    else loss += Math.abs(delta);
  }

  const maxElevation = Math.max(...elevations);
  const minElevation = Math.min(...elevations);
  const highestPoint = points.reduce((best, point) => {
    if (!Number.isFinite(point.ele)) return best;
    return !best || point.ele > best.ele ? point : best;
  }, null);

  return {
    elevationGain: gain,
    elevationLoss: loss,
    minElevation,
    maxElevation,
    highestPointKm: highestPoint?.distance ?? NaN
  };
}

function boundsFromPoints(points) {
  if (!points.length) return null;
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  points.forEach(({ lat, lon }) => {
    south = Math.min(south, lat);
    west = Math.min(west, lon);
    north = Math.max(north, lat);
    east = Math.max(east, lon);
  });
  return {
    south,
    west,
    north,
    east,
    center: { lat: (south + north) / 2, lon: (west + east) / 2 }
  };
}

export function parseGPXText(text, source = "") {
  const cleanText = String(text || "").replace(/^\uFEFF/, "");
  const xml = new DOMParser().parseFromString(cleanText, "application/xml");
  const parserError = xml.querySelector("parsererror");
  if (parserError) throw new Error(`GPX no válido: ${parserError.textContent.trim().slice(0, 160)}`);

  const segments = parseSegments(xml);
  if (!segments.length) throw new Error("El GPX no contiene puntos de track o ruta");
  const points = flattenSegments(segments);
  const elevation = elevationMetrics(points);
  const bounds = boundsFromPoints(points);

  return Object.freeze({
    source,
    segments,
    points,
    profile: points.filter((point) => Number.isFinite(point.ele)),
    bounds,
    center: bounds?.center ?? null,
    distanceKm: points.at(-1)?.distance ?? 0,
    ...elevation
  });
}

export async function loadGPX(url, { signal, cache = true } = {}) {
  if (!url) throw new Error("No se ha indicado la ruta del GPX");
  const cacheKey = String(url);
  if (cache && loadGPX.cache.has(cacheKey)) return loadGPX.cache.get(cacheKey);

  const promise = fetch(url, { signal }).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status} · ${url}`);
    return parseGPXText(await response.text(), url);
  }).catch((error) => {
    loadGPX.cache.delete(cacheKey);
    throw error;
  });

  if (cache) loadGPX.cache.set(cacheKey, promise);
  return promise;
}
loadGPX.cache = new Map();

export const GPXEngine = Object.freeze({ load: loadGPX, parse: parseGPXText, haversineKm });
