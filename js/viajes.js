import { loadRawData } from "./data.js";
import { buildDatabase } from "./db.js";
import { escapeHtml, normalizeSearch, formatDate, tripUrl } from "./shared.js";

let DB;

const els = {
  summary: document.querySelector("#trip-summary"),
  search: document.querySelector("#trip-search"),
  year: document.querySelector("#trip-year"),
  zone: document.querySelector("#trip-zone"),
  order: document.querySelector("#trip-order"),
  reset: document.querySelector("#trip-reset"),
  count: document.querySelector("#trip-count"),
  grid: document.querySelector("#trip-grid")
};

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function tripYear(trip) {
  return trip.fechaInicioDate?.getFullYear()?.toString() || "";
}

function uniqueSummits(trip) {
  const seen = new Map();
  trip.cumbres.forEach((summit) => {
    if (summit?.id && !seen.has(summit.id)) seen.set(summit.id, summit);
  });
  return [...seen.values()];
}

function peopleForTrip(trip) {
  const people = new Map();
  trip.ascensiones.forEach((ascent) => {
    ascent.personas.forEach((person) => {
      if (person?.id && !people.has(person.id)) people.set(person.id, person);
    });
  });
  return [...people.values()];
}

function dateRange(trip) {
  if (trip.fechaInicio && trip.fechaFin && trip.fechaInicio !== trip.fechaFin) {
    return `${formatDate(trip.fechaInicio)} – ${formatDate(trip.fechaFin)}`;
  }
  return formatDate(trip.fechaInicio || trip.fechaFin) || "Fecha no indicada";
}

function filteredTrips() {
  const query = normalizeSearch(els.search.value);
  const year = els.year.value;
  const zone = els.zone.value;

  const trips = DB.viajes.filter((trip) => {
    const summits = uniqueSummits(trip).map((summit) => summit.nombre).join(" ");
    const people = peopleForTrip(trip).map((person) => person.nombreCompleto || person.alias).join(" ");
    const haystack = normalizeSearch([
      trip.nombre,
      trip.zonaPrincipal,
      trip.base,
      trip.alojamiento,
      trip.pais,
      trip.descripcion,
      summits,
      people
    ].join(" "));

    if (query && !haystack.includes(query)) return false;
    if (year && tripYear(trip) !== year) return false;
    if (zone && trip.zonaPrincipal !== zone) return false;
    return true;
  });

  const order = els.order.value;
  trips.sort((a, b) => {
    if (order === "date-asc") {
      return (a.fechaInicioDate?.getTime() || 0) - (b.fechaInicioDate?.getTime() || 0);
    }
    if (order === "summits-desc") {
      return uniqueSummits(b).length - uniqueSummits(a).length ||
        (b.fechaInicioDate?.getTime() || 0) - (a.fechaInicioDate?.getTime() || 0);
    }
    if (order === "name") return a.nombre.localeCompare(b.nombre, "es");
    return (b.fechaInicioDate?.getTime() || 0) - (a.fechaInicioDate?.getTime() || 0);
  });

  return trips;
}

function tripCard(trip) {
  const summits = uniqueSummits(trip);
  const people = peopleForTrip(trip);
  const summitNames = summits.slice(0, 4).map((summit) => summit.nombre);
  const extra = summits.length - summitNames.length;

  return `
    <a class="trip-card" href="${tripUrl(trip)}">
      <div class="trip-card-visual">
        <span class="trip-year">${escapeHtml(tripYear(trip) || "—")}</span>
        <svg viewBox="0 0 240 120" aria-hidden="true">
          <path d="M2 111 55 39l29 39 22-28 31 36 24-31 77 56H2Z"/>
          <path d="m39 60 16-21 20 27m18 4 13-20 20 24m27 6 9-25 24 31"/>
        </svg>
      </div>

      <div class="trip-card-body">
        <p class="trip-date">${escapeHtml(dateRange(trip))}</p>
        <h2>${escapeHtml(trip.nombre)}</h2>
        <p class="trip-place">${escapeHtml([trip.zonaPrincipal, trip.pais].filter(Boolean).join(" · "))}</p>

        <div class="trip-card-stats">
          <div><strong>${summits.length}</strong><span>${summits.length === 1 ? "cumbre" : "cumbres"}</span></div>
          <div><strong>${people.length}</strong><span>${people.length === 1 ? "persona" : "personas"}</span></div>
        </div>

        ${summitNames.length ? `
          <p class="trip-summits">${escapeHtml(summitNames.join(" · "))}${extra > 0 ? ` · +${extra}` : ""}</p>
        ` : ""}

        <div class="trip-card-footer">
          <span>${escapeHtml(trip.alojamiento || trip.base || "Sin base indicada")}</span>
          <strong>Abrir viaje →</strong>
        </div>
      </div>
    </a>
  `;
}

function render() {
  const trips = filteredTrips();
  els.count.textContent = `${trips.length} viaje${trips.length === 1 ? "" : "s"}`;
  els.grid.innerHTML = trips.length
    ? trips.map(tripCard).join("")
    : `<div class="archive-empty"><strong>No hay resultados</strong><p>Prueba con otros filtros.</p></div>`;
}

async function start() {
  try {
    DB = buildDatabase(await loadRawData());

    const totalSummits = new Set(
      DB.viajes.flatMap((trip) => uniqueSummits(trip).map((summit) => summit.id))
    ).size;

    els.summary.textContent = `${DB.viajes.length} viajes · ${totalSummits} cumbres documentadas en ellos.`;

    const years = uniqueSorted(DB.viajes.map(tripYear)).sort((a, b) => Number(b) - Number(a));
    els.year.innerHTML = `<option value="">Todos los años</option>` +
      years.map((value) => `<option value="${value}">${value}</option>`).join("");

    els.zone.innerHTML = `<option value="">Todas las zonas</option>` +
      uniqueSorted(DB.viajes.map((trip) => trip.zonaPrincipal))
        .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
        .join("");

    [els.search, els.year, els.zone, els.order].forEach((element) => {
      element.addEventListener(element === els.search ? "input" : "change", render);
    });

    els.reset.addEventListener("click", () => {
      els.search.value = "";
      els.year.value = "";
      els.zone.value = "";
      els.order.value = "date-desc";
      render();
    });

    render();
  } catch (error) {
    console.error(error);
    els.summary.textContent = `No se pudieron cargar los datos: ${error.message}`;
  }
}

start();
