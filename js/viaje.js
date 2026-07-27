import { loadRawData } from "./data.js";
import { buildDatabase } from "./db.js";
import { escapeHtml, formatDate, personUrl, summitUrl } from "./shared.js";
import { travelMedia } from "./travel-media.js";

const root = document.querySelector("#trip-detail");

function externalLink(url, label, className = "detail-action") {
  return url
    ? `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`
    : "";
}

function accommodationValue(trip) {
  const name = trip.alojamiento || "—";
  return trip.urlAlojamiento && trip.alojamiento
    ? `<a class="fact-link" href="${escapeHtml(trip.urlAlojamiento)}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)} ↗</a>`
    : escapeHtml(name);
}

function trackSection(trip) {
  if (!trip.tracks?.length) return "";

  return `
    <section class="trip-tracks-section">
      <p class="eyebrow">Huellas de la actividad</p>
      <h2>Tracks</h2>
      <div class="trip-track-list">
        ${trip.tracks.map((track, index) => `
          <a class="trip-track-card" href="${escapeHtml(track.url)}" target="_blank" rel="noopener noreferrer">
            <span class="trip-track-number">${String(index + 1).padStart(2, "0")}</span>
            <span class="trip-track-copy">
              <strong>${escapeHtml(track.titulo || `Track ${index + 1}`)}</strong>
              <small>Abrir registro de la actividad</small>
            </span>
            <span class="trip-track-arrow" aria-hidden="true">↗</span>
          </a>
        `).join("")}
      </div>
      <p class="trip-track-notice"><strong>Aviso:</strong> estos tracks son únicamente registros documentales de la actividad realizada. No constituyen rutas recomendadas ni garantizan que el itinerario sea adecuado, seguro o transitable en otras condiciones.</p>
    </section>
  `;
}

function uniqueSummits(trip) {
  const map = new Map();
  trip.cumbres.forEach((summit) => {
    if (summit?.id && !map.has(summit.id)) map.set(summit.id, summit);
  });
  return [...map.values()];
}

function peopleForTrip(trip) {
  const map = new Map();
  trip.ascensiones.forEach((ascent) => {
    ascent.personas.forEach((person) => {
      if (person?.id && !map.has(person.id)) map.set(person.id, person);
    });
  });
  return [...map.values()];
}

function dateRange(trip) {
  if (trip.fechaInicio && trip.fechaFin && trip.fechaInicio !== trip.fechaFin) {
    return `${formatDate(trip.fechaInicio)} – ${formatDate(trip.fechaFin)}`;
  }
  return formatDate(trip.fechaInicio || trip.fechaFin) || "Fecha no indicada";
}

function summitList(trip) {
  return uniqueSummits(trip)
    .sort((a, b) => (b.altitud || 0) - (a.altitud || 0))
    .map((summit) => {
      const ascent = trip.ascensiones.find((item) => item.idCumbre === summit.id);
      return `
        <a class="trip-summit-row" href="${summitUrl(summit)}">
          <span class="trip-summit-index">${String(trip.ascensiones.indexOf(ascent) + 1).padStart(2, "0")}</span>
          <span class="trip-summit-name">${escapeHtml(summit.nombre)}</span>
          <strong>${summit.altitud || "—"} <small>m</small></strong>
        </a>
      `;
    }).join("");
}

function renderMap(trip) {
  const mapElement = document.querySelector("#trip-map");
  if (!mapElement) return;

  const summits = uniqueSummits(trip).filter((summit) =>
    summit.latitud !== null && summit.longitud !== null
  );
  if (!summits.length) {
    mapElement.innerHTML = `<div class="archive-empty"><p>No hay coordenadas disponibles para este viaje.</p></div>`;
    return;
  }

  const map = L.map("trip-map", { scrollWheelZoom: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const bounds = [];
  summits.forEach((summit, index) => {
    const latlng = [summit.latitud, summit.longitud];
    bounds.push(latlng);

    const marker = L.circleMarker(latlng, {
      radius: 8,
      color: "#075c36",
      fillColor: "#18b968",
      fillOpacity: 1,
      weight: 3
    }).addTo(map);

    marker.bindTooltip(`${index + 1}. ${summit.nombre}`, { direction: "top" });
  });

  if (bounds.length === 1) map.setView(bounds[0], 12);
  else map.fitBounds(bounds, { padding: [45, 45], maxZoom: 11 });
}

async function start() {
  try {
    const db = buildDatabase(await loadRawData());
    const id = new URLSearchParams(location.search).get("id")?.toUpperCase();
    const trip = db.indexes.viajesById.get(id);

    if (!trip) {
      root.innerHTML = `<section class="detail-loading shell"><h1>Viaje no encontrado</h1><a href="viajes.html">Volver al archivo</a></section>`;
      return;
    }

    const summits = uniqueSummits(trip);
    const people = peopleForTrip(trip);
    const media = travelMedia(trip);
    const heroStyle = media
      ? ` style="background-image: linear-gradient(90deg, rgb(28 18 10 / 90%), rgb(14 20 22 / 18%)), url('${escapeHtml(media.cover)}'); background-position: ${escapeHtml(media.heroPosition)}"`
      : "";
    document.title = `${trip.nombre} · Los Tresmiles de Iñaki`;

    root.innerHTML = `
      <section class="trip-detail-hero${media ? " has-photo" : ""}"${heroStyle}>
        <div class="shell">
          <nav class="breadcrumbs detail-breadcrumbs" aria-label="Migas de pan">
            <a href="index.html">Inicio</a><span>/</span>
            <a href="viajes.html">Viajes</a><span>/</span>
            <span>${escapeHtml(trip.nombre)}</span>
          </nav>
          <a class="back-link" href="viajes.html">← Todos los viajes</a>
          <p class="trip-detail-date">${escapeHtml(dateRange(trip))}</p>
          <h1>${escapeHtml(trip.nombre)}</h1>
          <p class="trip-detail-place">${escapeHtml([trip.zonaPrincipal, trip.pais].filter(Boolean).join(" · "))}</p>

          <div class="trip-detail-numbers">
            <div><strong>${summits.length}</strong><span>${summits.length === 1 ? "cumbre" : "cumbres"}</span></div>
            <div><strong>${people.length}</strong><span>${people.length === 1 ? "persona" : "personas"}</span></div>
          </div>
        </div>
      </section>

      <section class="detail-body shell trip-detail-body">
        <div class="detail-main">
          ${trip.descripcion ? `
            <section class="trip-description">
              <p class="eyebrow">El viaje</p>
              <h2>Una salida al Pirineo</h2>
              <p>${escapeHtml(trip.descripcion)}</p>
            </section>
          ` : ""}

          ${trackSection(trip)}

          <section>
            <p class="eyebrow">Recorrido</p>
            <h2>Mapa de cumbres</h2>
            <div id="trip-map"></div>
          </section>

          <section>
            <p class="eyebrow">Cumbres</p>
            <h2>${summits.length} tresmiles en este viaje</h2>
            <div class="trip-summit-list">
              ${summits.length ? summitList(trip) : `<div class="archive-empty"><p>No hay cumbres relacionadas.</p></div>`}
            </div>
          </section>
        </div>

        <aside class="detail-sidebar">
          <section class="detail-facts-card">
            <p class="eyebrow">Ficha del viaje</p>
            <dl>
              <div><dt>Fechas</dt><dd>${escapeHtml(dateRange(trip))}</dd></div>
              <div><dt>Zona</dt><dd>${escapeHtml(trip.zonaPrincipal || "—")}</dd></div>
              <div><dt>Base</dt><dd>${escapeHtml(trip.base || "—")}</dd></div>
              <div><dt>Alojamiento</dt><dd>${accommodationValue(trip)}</dd></div>
              <div><dt>País</dt><dd>${escapeHtml(trip.pais || "—")}</dd></div>
            </dl>

            <div class="detail-actions">
              ${externalLink(trip.album, "Ver fotografías")}
              ${externalLink(trip.video, "Ver vídeo")}
            </div>
          </section>

          <section class="trip-people-card">
            <p class="eyebrow">Compañía</p>
            <h2>Personas</h2>
            <div class="trip-people-list">
              ${people.length
                ? people.map((person) => person.id === "P010"
                  ? `<span>${escapeHtml(person.nombreCompleto || person.alias || person.id)}</span>`
                  : `<a href="${personUrl(person)}">${escapeHtml(person.nombreCompleto || person.alias || person.id)} <span aria-hidden="true">→</span></a>`).join("")
                : "<p>No hay personas registradas.</p>"}
            </div>
          </section>

          ${trip.meteorologia || trip.notas ? `
            <section class="trip-notes-card">
              <p class="eyebrow">Recuerdos</p>
              ${trip.meteorologia ? `<h3>Meteorología</h3><p>${escapeHtml(trip.meteorologia)}</p>` : ""}
              ${trip.notas ? `<h3>Notas</h3><p>${escapeHtml(trip.notas)}</p>` : ""}
            </section>
          ` : ""}
        </aside>
      </section>
    `;

    renderMap(trip);
  } catch (error) {
    console.error(error);
    root.innerHTML = `<section class="detail-loading shell"><h1>Error al cargar el viaje</h1><p>${escapeHtml(error.message)}</p></section>`;
  }
}

start();
