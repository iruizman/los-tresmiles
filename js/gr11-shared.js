export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function etapaUrl(etapa) {
  return `gr11-etapa.html?id=${encodeURIComponent(etapa.id)}`;
}

export function gpxUrl(trackReferencia) {
  const value = String(trackReferencia ?? "").trim();
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) {
    return value;
  }
  return `./gr11/gpx/${encodeURIComponent(value)}`;
}

export function statusLabel(status) {
  return {
    realizada: "Realizada",
    planificada: "Planificada",
    pendiente: "Pendiente"
  }[status] ?? "Pendiente";
}

export function numberText(value, suffix = "") {
  return value === null || value === undefined || value === "" ? "—" : `${value}${suffix}`;
}
