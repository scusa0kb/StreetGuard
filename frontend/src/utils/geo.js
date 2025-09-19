export function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function timeAgo(isoDate) {
  const t = new Date(isoDate).getTime();
  if (!isFinite(t)) return "agora";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}min`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h`;
  const d = h / 24;
  return `${Math.floor(d)}d`;
}

// Converte até 'maxMeters' a partir de (lat0, lon0) na direção de (lat1, lon1)
// Se (lat1, lon1) já estiver dentro do raio, retorna o próprio ponto.
// Aproximação suficiente para <= 2 km.
export function clampPointWithinRadius(lat0, lon0, lat1, lon1, maxMeters) {
  const metersPerDegLat = 111320;
  const metersPerDegLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);

  const dx = (lon1 - lon0) * metersPerDegLon(lat0);
  const dy = (lat1 - lat0) * metersPerDegLat;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (!isFinite(d) || d === 0) return { lat: lat1, lng: lon1 };
  if (d <= maxMeters) return { lat: lat1, lng: lon1 };

  const k = maxMeters / d;
  const clampedDx = dx * k;
  const clampedDy = dy * k;

  const newLon = lon0 + clampedDx / metersPerDegLon(lat0);
  const newLat = lat0 + clampedDy / metersPerDegLat;

  return { lat: newLat, lng: newLon };
}