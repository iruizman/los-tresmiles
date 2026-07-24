
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function formatDate(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return value;
  const [, day, month, year] = match;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(Number(year), Number(month) - 1, Number(day)));
}

export function summitUrl(summit) {
  return `cumbre.html?id=${encodeURIComponent(summit.id)}`;
}

export function isPrimary(summit) {
  return normalizeSearch(summit.tipo).startsWith("principal");
}

export function tripUrl(trip) {
  return `viaje.html?id=${encodeURIComponent(trip.id)}`;
}

export function personUrl(person) {
  return `persona.html?id=${encodeURIComponent(person.id)}`;
}
