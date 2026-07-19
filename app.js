import { loadRawData } from "./data.js";
import { buildDatabase } from "./db.js";
import { summitUrl, tripUrl } from "./shared.js";

let map;
let markersLayer;
let DB;

const markerBySummitId = new Map();

const els = {
  status: document.querySelector("#status"),
  warningCount: document.querySelector("#warning-count"),
  heroProgress: document.querySelector("#hero-progress"),
  stats: document.querySelector("#stats"),
  mapSummary: document.querySelector("#map-summary"),

  filterMacizo: document.querySelector("#filter-macizo"),
  filterPais: document.querySelector("#filter-pais"),
  filterTipo: document.querySelector("#filter-tipo"),
  filterEstado: document.querySelector("#filter-estado"),
  resetFilters: document.querySelector("#reset-filters"),

  openSearch: document.querySelector("#open-search"),
  heroSearch: document.querySelector("#hero-search"),
  mapSearchMobile: document.querySelector("#map-search-mobile"),
  closeSearch: document.querySelector("#close-search"),
  searchPanel: document.querySelector("#search-panel"),
  searchBackdrop: document.querySelector("#search-backdrop"),
  searchInput: document.querySelector("#search-input"),
  searchResults: document.querySelector("#search-results"),
  searchCount: document.querySelector("#search-count")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDate(value) {
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

function iconLink(url, icon, label) {
  if (!url) return "";
  return `<a class="popup-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
    <span aria-hidden="true">${icon}</span>${label}
  </a>`;
}

function isPrimary(summit) {
  return normalizeSearch(summit.tipo).startsWith("principal");
}

function markerStyle(summit) {
  const climbed = summit.ascendida;
  const primary = isPrimary(summit);

  return {
    radius: primary ? (climbed ? 7.8 : 7) : (climbed ? 5.8 : 5.2),
    weight: primary ? 2.4 : 1.5,
    color: climbed ? "#075c36" : "#8f1515",
    fillColor: climbed ? "#18b968" : "#e43d3d",
    fillOpacity: primary ? 0.96 : 0.82,
    dashArray: primary ? null : "2 2"
  };
}

function initMap() {
  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true,
    preferCanvas: true
  }).setView([42.72, 0.2], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function popupHtml(summit) {
  const ascents = summit.ascensiones.map((ascent) => {
    const people = ascent.personas
      .map((person) => person.nombreCompleto || person.alias)
      .filter(Boolean)
      .join(", ");

    const trip = ascent.viaje;

    return `
      <section class="popup-ascent">
        <div class="popup-detail">
          <span aria-hidden="true">📅</span>
          <div>
            <small>Ascensión</small>
            <strong>${escapeHtml(formatDate(ascent.fecha) || "Fecha sin indicar")}</strong>
          </div>
        </div>

        ${trip ? `
          <div class="popup-detail">
            <span aria-hidden="true">🗺️</span>
            <div>
              <small>Viaje</small>
              <strong><a class="popup-inline-link" href="${tripUrl(trip)}">${escapeHtml(trip.nombre)}</a></strong>
            </div>
          </div>` : ""}

        ${people ? `
          <div class="popup-detail">
            <span aria-hidden="true">👥</span>
            <div>
              <small>Compañeros</small>
              <span>${escapeHtml(people)}</span>
            </div>
          </div>` : ""}

        <div class="popup-actions">
          ${iconLink(trip?.album || ascent.fotos, "▧", "Fotos")}
          ${iconLink(trip?.track || ascent.track, "⌁", "Track")}
          ${iconLink(trip?.video, "▶", "Vídeo")}
        </div>
      </section>
    `;
  }).join("");

  return `
    <article class="popup-card">
      <div class="popup-topline">
        <span class="popup-type">${escapeHtml(summit.tipo || "Tresmil")}</span>
        <span class="popup-status ${summit.ascendida ? "done" : "pending"}">
          ${summit.ascendida ? "✓ Ascendida" : "● Pendiente"}
        </span>
      </div>

      <h3>${escapeHtml(summit.nombre)}</h3>
      ${summit.nombreAlternativo ? `<p class="popup-alt-name">${escapeHtml(summit.nombreAlternativo)}</p>` : ""}

      <div class="popup-facts">
        <strong>${summit.altitud ? `${summit.altitud} m` : ""}</strong>
        <span>${escapeHtml(summit.macizo || summit.zonaUIAA || "")}</span>
        <span>${escapeHtml(summit.pais || "")}</span>
      </div>

      ${ascents || `<p class="popup-empty">Todavía no hay ascensiones registradas.</p>`}
      <a class="popup-detail-link" href="${summitUrl(summit)}">Ver ficha completa →</a>
    </article>
  `;
}


function statIcon(name) {
  const icons = {
    mountain: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M5 52 24 18l9 16 7-12 19 30H5Z"/>
      <path d="m18 29 6-11 7 13m7 1 3-8 7 11"/>
    </svg>`,
    calendar: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="10" y="14" width="44" height="40" rx="5"/>
      <path d="M18 8v12M46 8v12M10 25h44"/>
      <path d="M19 33h6M31 33h6M43 33h3M19 43h6M31 43h6M43 43h3"/>
    </svg>`,
    backpack: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M23 17v-3c0-5 3-8 9-8s9 3 9 8v3"/>
      <rect x="16" y="15" width="32" height="42" rx="10"/>
      <path d="M16 27H9v20h7M48 27h7v20h-7M23 28h18M23 39h18M26 57v-6M38 57v-6"/>
    </svg>`,
    summit: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M5 52 24 18l9 16 7-12 19 30H5Z"/>
      <path d="M41 23V7M41 8h13l-4 6 4 6H41"/>
      <path d="m18 29 6-11 7 13"/>
    </svg>`,
    route: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M17 46c0 6-7 11-7 11s-7-5-7-11a7 7 0 1 1 14 0Z"/>
      <circle cx="10" cy="46" r="2.2"/>
      <path d="M54 13c0 6-7 11-7 11s-7-5-7-11a7 7 0 1 1 14 0Z"/>
      <circle cx="47" cy="13" r="2.2"/>
      <path d="M17 46c17 0 8-17 22-17 8 0 8-7 8-7" stroke-dasharray="5 5"/>
    </svg>`
  };
  return icons[name] || "";
}

function renderStats(db) {
  const firstAscent = db.ascensiones
    .filter((ascent) => ascent.fechaDate instanceof Date && !Number.isNaN(ascent.fechaDate))
    .sort((a, b) => a.fechaDate - b.fechaDate)[0];

  const firstAscentYear = firstAscent
    ? String(firstAscent.fechaDate.getFullYear())
    : "—";

  const firstAscentNote = firstAscent
    ? [
        formatDate(firstAscent.fecha),
        firstAscent.cumbre?.nombre
      ].filter(Boolean).join(" · ")
    : "Sin fecha registrada";

  const highestSummit = db.cumbres
    .filter((summit) => summit.ascendida && Number.isFinite(summit.altitud))
    .sort((a, b) => b.altitud - a.altitud)[0];

  const tripsWithUniqueSummits = db.viajes
    .map((trip) => ({
      trip,
      summitCount: new Set(
        trip.cumbres
          .map((summit) => summit?.id)
          .filter(Boolean)
      ).size
    }))
    .sort((a, b) =>
      b.summitCount - a.summitCount ||
      (a.trip.fechaInicioDate ?? new Date(8640000000000000)) -
      (b.trip.fechaInicioDate ?? new Date(8640000000000000))
    );

  const topTrip = tripsWithUniqueSummits[0];

  const items = [
    {
      icon: "mountain",
      label: "Cumbres ascendidas",
      value: `${db.stats.cumbresAscendidas}`,
      note: "tresmiles diferentes"
    },
    {
      icon: "calendar",
      label: "Primera ascensión",
      value: firstAscentYear,
      note: firstAscentNote
    },
    {
      icon: "backpack",
      label: "Viajes realizados",
      value: `${db.stats.viajes}`,
      note: "por el Pirineo"
    },
    {
      icon: "summit",
      label: "Cima más alta",
      value: highestSummit ? `${highestSummit.altitud} m` : "—",
      note: highestSummit?.nombre || "Sin datos"
    },
    {
      icon: "route",
      label: "Más tresmiles en un viaje",
      value: topTrip ? `${topTrip.summitCount}` : "—",
      note: topTrip?.trip.nombre || "Sin datos"
    }
  ];

  els.stats.innerHTML = items.map((item, index) => {
    const altitudeMatch = String(item.value).match(/^(\d+)\s*m$/);
    const valueHtml = altitudeMatch
      ? `${escapeHtml(altitudeMatch[1])}<span class="stat-unit">m</span>`
      : escapeHtml(item.value);

    return `
      <article class="stat-card">
        <span class="stat-number">${String(index + 1).padStart(2, "0")}</span>
        <div class="stat-content">
          <span class="stat-icon" aria-hidden="true">${statIcon(item.icon)}</span>
          <strong>${valueHtml}</strong>
          <span class="stat-label">${escapeHtml(item.label)}</span>
          <small>${escapeHtml(item.note)}</small>
        </div>
      </article>
    `;
  }).join("");

  if (els.heroProgress) {
    els.heroProgress.textContent =
      `${db.stats.cumbresAscendidas} cumbres ascendidas · ${db.stats.viajes} viajes`;
  }

  els.mapSummary.textContent =
    `${db.stats.cumbresAscendidas} cumbres ascendidas en ${db.stats.viajes} viajes por el Pirineo.`;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es"));
}

function fillSelect(element, values, allLabel) {
  element.innerHTML = `<option value="">${allLabel}</option>` +
    values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
}

function populateFilters(db) {
  fillSelect(
    els.filterMacizo,
    uniqueSorted(db.cumbres.map((summit) => summit.macizo)),
    "Todos los macizos"
  );

  fillSelect(
    els.filterPais,
    uniqueSorted(db.cumbres.map((summit) => summit.pais)),
    "Todos los países"
  );

  fillSelect(
    els.filterTipo,
    uniqueSorted(db.cumbres.map((summit) => summit.tipo)),
    "Todos los tipos"
  );
}

function getFilteredSummits() {
  const macizo = els.filterMacizo.value;
  const pais = els.filterPais.value;
  const tipo = els.filterTipo.value;
  const estado = els.filterEstado.value;

  return DB.cumbres.filter((summit) => {
    if (macizo && summit.macizo !== macizo) return false;
    if (pais && summit.pais !== pais) return false;
    if (tipo && summit.tipo !== tipo) return false;
    if (estado === "ascendida" && !summit.ascendida) return false;
    if (estado === "pendiente" && summit.ascendida) return false;
    return true;
  });
}

function updateMapSummary(visibleCount) {
  const filtersActive = [
    els.filterMacizo.value,
    els.filterPais.value,
    els.filterTipo.value,
    els.filterEstado.value
  ].some(Boolean);

  if (!filtersActive) {
    els.mapSummary.textContent =
      `${DB.stats.cumbresAscendidas} cumbres ascendidas en ${DB.stats.viajes} viajes por el Pirineo.`;
    return;
  }

  els.mapSummary.textContent =
    `${visibleCount} cumbre${visibleCount === 1 ? "" : "s"} coinciden con los filtros.`;
}

function renderMap({ preserveView = false } = {}) {
  const summits = getFilteredSummits();

  markersLayer.clearLayers();
  markerBySummitId.clear();

  const bounds = [];

  summits.forEach((summit) => {
    if (summit.latitud === null || summit.longitud === null) return;

    const marker = L.circleMarker(
      [summit.latitud, summit.longitud],
      markerStyle(summit)
    )
      .bindPopup(popupHtml(summit), {
        maxWidth: 370,
        className: "summit-popup"
      })
      .addTo(markersLayer);

    markerBySummitId.set(summit.id, marker);
    bounds.push([summit.latitud, summit.longitud]);
  });

  if (!preserveView && bounds.length) {
    map.fitBounds(bounds, {
      padding: [42, 42],
      maxZoom: 10,
      animate: true
    });
  }

  updateMapSummary(summits.length);
  renderSearchResults();
}

function summitSearchText(summit) {
  const ascentText = summit.ascensiones.map((ascent) => {
    const trip = ascent.viaje;
    const people = ascent.personas.map((person) =>
      `${person.nombreCompleto} ${person.alias || ""}`
    ).join(" ");

    return [
      ascent.fecha,
      trip?.nombre,
      trip?.base,
      trip?.alojamiento,
      trip?.zonaPrincipal,
      people
    ].join(" ");
  }).join(" ");

  return normalizeSearch([
    summit.nombre,
    summit.nombreAlternativo,
    summit.macizo,
    summit.zonaUIAA,
    summit.pais,
    summit.tipo,
    ascentText
  ].join(" "));
}

function currentSearchResults() {
  const query = normalizeSearch(els.searchInput.value);
  const candidates = getFilteredSummits();

  return candidates
    .filter((summit) => !query || summitSearchText(summit).includes(query))
    .sort((a, b) => {
      if (a.ascendida !== b.ascendida) return a.ascendida ? -1 : 1;
      return a.nombre.localeCompare(b.nombre, "es");
    });
}

function matchingContext(summit, query) {
  if (!query) return summit.macizo || summit.zonaUIAA || "";

  for (const ascent of summit.ascensiones) {
    const trip = ascent.viaje;
    const contexts = [
      trip?.nombre,
      trip?.base,
      trip?.alojamiento,
      ...ascent.personas.map((person) => person.nombreCompleto || person.alias)
    ].filter(Boolean);

    const match = contexts.find((value) => normalizeSearch(value).includes(query));
    if (match) return match;
  }

  return summit.macizo || summit.zonaUIAA || "";
}

function renderSearchResults() {
  if (!DB) return;

  const query = normalizeSearch(els.searchInput.value);
  const results = currentSearchResults();

  els.searchCount.textContent =
    `${results.length} resultado${results.length === 1 ? "" : "s"}`;

  if (!results.length) {
    els.searchResults.innerHTML = `
      <div class="empty-search">
        <strong>No hay coincidencias</strong>
        <p>Prueba con una cumbre, persona, viaje, refugio o macizo.</p>
      </div>
    `;
    return;
  }

  els.searchResults.innerHTML = results.map((summit) => `
    <button class="search-result" type="button" data-summit-id="${summit.id}">
      <span class="search-result-marker ${summit.ascendida ? "done" : "pending"} ${isPrimary(summit) ? "primary" : "secondary"}"></span>
      <span class="search-result-main">
        <strong>${escapeHtml(summit.nombre)}</strong>
        <small>${escapeHtml(matchingContext(summit, query))}</small>
      </span>
      <span class="search-result-meta">
        <b>${summit.altitud ? `${summit.altitud} m` : ""}</b>
        <small>${escapeHtml(summit.tipo || "")}</small>
      </span>
    </button>
  `).join("");
}

function openSearch() {
  els.searchPanel.classList.add("is-open");
  els.searchBackdrop.classList.add("is-open");
  els.searchPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("panel-open");
  renderSearchResults();
  setTimeout(() => els.searchInput.focus(), 80);
}

function closeSearch() {
  els.searchPanel.classList.remove("is-open");
  els.searchBackdrop.classList.remove("is-open");
  els.searchPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("panel-open");
}

function focusSummit(id) {
  const summit = DB.indexes.cumbresById.get(id);
  if (!summit || summit.latitud === null || summit.longitud === null) return;

  closeSearch();

  let marker = markerBySummitId.get(id);

  if (!marker) {
    els.filterMacizo.value = "";
    els.filterPais.value = "";
    els.filterTipo.value = "";
    els.filterEstado.value = "";
    renderMap({ preserveView: true });
    marker = markerBySummitId.get(id);
  }

  document.querySelector("#mapa").scrollIntoView({ behavior: "smooth" });

  setTimeout(() => {
    map.flyTo([summit.latitud, summit.longitud], 13, {
      duration: 1.1
    });
    setTimeout(() => marker?.openPopup(), 1050);
  }, 500);
}

function resetFilters() {
  els.filterMacizo.value = "";
  els.filterPais.value = "";
  els.filterTipo.value = "";
  els.filterEstado.value = "";
  renderMap();
}

function bindEvents() {
  [
    els.filterMacizo,
    els.filterPais,
    els.filterTipo,
    els.filterEstado
  ].forEach((element) => element.addEventListener("change", () => renderMap()));

  els.resetFilters.addEventListener("click", resetFilters);

  const headerSearch = document.querySelector("#header-search");
  [els.openSearch, els.heroSearch, els.mapSearchMobile, headerSearch]
    .filter(Boolean)
    .forEach((button) => button.addEventListener("click", openSearch));

  els.closeSearch.addEventListener("click", closeSearch);
  els.searchBackdrop.addEventListener("click", closeSearch);
  els.searchInput.addEventListener("input", renderSearchResults);

  els.searchResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-summit-id]");
    if (button) focusSummit(button.dataset.summitId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSearch();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
    }
  });
}

async function start() {
  try {
    if (els.status) els.status.textContent = "Cargando datos de Google Sheets…";

    initMap();

    const raw = await loadRawData();
    DB = buildDatabase(raw);
    window.DB = DB;

    renderStats(DB);
    populateFilters(DB);
    renderMap();
    bindEvents();

    if (els.warningCount) {
      els.warningCount.textContent = DB.warnings.length
        ? `${DB.warnings.length} avisos de datos`
        : "Base de datos revisada";
    }

    if (DB.warnings.length) {
      console.warn("Avisos de la base de datos:", DB.warnings);
    }

    if (els.status) {
      els.status.textContent = "Datos actualizados desde Google Sheets";
      els.status.classList.add("ok");
    }
  } catch (error) {
    console.error(error);
    if (els.status) {
      els.status.textContent = `Error al cargar los datos: ${error.message}`;
      els.status.classList.add("error");
    }
  }
}

start();
