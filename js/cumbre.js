import { loadRawData } from "./data.js";
import { buildDatabase } from "./db.js";
import { escapeHtml, formatDate, personUrl, summitUrl, tripUrl } from "./shared.js";

const root = document.querySelector("#summit-detail");

function externalLink(url, label) {
  return url
    ? `<a class="detail-action" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`
    : "";
}

function ascentHtml(ascent) {
  const people = ascent.personas.filter((person) => person.nombreCompleto || person.alias || person.id);

  return `
    <article class="ascent-record">
      <div>
        <p class="eyebrow">Ascensión</p>
        <h3>${escapeHtml(formatDate(ascent.fecha) || "Fecha no indicada")}</h3>
        ${ascent.viaje ? `<p class="ascent-trip"><a href="${tripUrl(ascent.viaje)}">${escapeHtml(ascent.viaje.nombre)}</a></p>` : ""}
      </div>
      <dl>
        ${ascent.puntoSalida ? `<div><dt>Punto de salida</dt><dd>${escapeHtml(ascent.puntoSalida)}</dd></div>` : ""}
        ${ascent.alojamiento || ascent.viaje?.alojamiento ? `<div><dt>Alojamiento</dt><dd>${escapeHtml(ascent.alojamiento || ascent.viaje.alojamiento)}</dd></div>` : ""}
        ${people.length ? `<div><dt>Compañeros</dt><dd class="ascent-people">${people.map((person) => person.id === "P010" ? `<span>${escapeHtml(person.nombreCompleto || person.alias || person.id)}</span>` : `<a href="${personUrl(person)}">${escapeHtml(person.nombreCompleto || person.alias || person.id)}</a>`).join("")}</dd></div>` : ""}
      </dl>
      <div class="detail-actions">
        ${externalLink(ascent.viaje?.album || ascent.fotos, "Ver fotografías")}
        ${externalLink(ascent.viaje?.track || ascent.track, "Abrir track")}
        ${externalLink(ascent.viaje?.video, "Ver vídeo")}
      </div>
      ${ascent.notas ? `<p class="ascent-notes">${escapeHtml(ascent.notas)}</p>` : ""}
    </article>
  `;
}

function relatedHtml(summit, db) {
  return db.cumbres
    .filter((item) => item.id !== summit.id && item.macizo && item.macizo === summit.macizo)
    .sort((a, b) => (b.altitud || 0) - (a.altitud || 0))
    .slice(0, 5)
    .map((item) => `
      <a class="related-summit" href="${summitUrl(item)}">
        <span>${escapeHtml(item.nombre)}</span>
        <strong>${item.altitud || "—"} m</strong>
      </a>
    `).join("");
}

function renderMap(summit) {
  if (summit.latitud === null || summit.longitud === null) return;
  const map = L.map("summit-map", { scrollWheelZoom: false })
    .setView([summit.latitud, summit.longitud], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  L.circleMarker([summit.latitud, summit.longitud], {
    radius: 9,
    color: summit.ascendida ? "#075c36" : "#8f1515",
    fillColor: summit.ascendida ? "#18b968" : "#e43d3d",
    fillOpacity: 1,
    weight: 3
  }).addTo(map);
}

async function start() {
  try {
    const db = buildDatabase(await loadRawData());
    const id = new URLSearchParams(location.search).get("id")?.toUpperCase();
    const summit = db.indexes.cumbresById.get(id);

    if (!summit) {
      root.innerHTML = `<section class="detail-loading shell"><h1>Cumbre no encontrada</h1><a href="cumbres.html">Volver al archivo</a></section>`;
      return;
    }

    document.title = `${summit.nombre} · Los Tresmiles de Iñaki`;

    root.innerHTML = `
      <section class="summit-detail-hero">
        <div class="shell">
          <nav class="breadcrumbs detail-breadcrumbs" aria-label="Migas de pan">
            <a href="index.html">Inicio</a><span>/</span>
            <a href="cumbres.html">Cumbres</a><span>/</span>
            <span>${escapeHtml(summit.nombre)}</span>
          </nav>
          <a class="back-link" href="cumbres.html">← Todas las cumbres</a>
          <div class="detail-status-line">
            <span class="summit-status ${summit.ascendida ? "done" : "pending"}">${summit.ascendida ? "Ascendida" : "Sin ascensión registrada"}</span>
            <span>${escapeHtml(summit.tipo || "Tresmil")}</span>
          </div>
          <h1>${escapeHtml(summit.nombre)}</h1>
          ${summit.nombreAlternativo ? `<p class="detail-alt-name">${escapeHtml(summit.nombreAlternativo)}</p>` : ""}
          <div class="detail-hero-facts">
            <strong>${summit.altitud || "—"}<small> m</small></strong>
            <span>${escapeHtml(summit.macizo || "")}</span>
            <span>${escapeHtml(summit.pais || "")}</span>
          </div>
        </div>
      </section>

      <section class="detail-body shell">
        <div class="detail-main">
          <section>
            <p class="eyebrow">En el mapa</p>
            <h2>Ubicación</h2>
            <div id="summit-map"></div>
          </section>

          <section class="ascent-section">
            <p class="eyebrow">Historia personal</p>
            <h2>${summit.ascensiones.length === 1 ? "Ascensión registrada" : `${summit.ascensiones.length} ascensiones registradas`}</h2>
            <div class="ascent-list">
              ${summit.ascensiones.length
                ? [...summit.ascensiones]
                    .sort((a, b) => (a.fechaDate || 0) - (b.fechaDate || 0))
                    .map(ascentHtml).join("")
                : `<div class="archive-empty"><p>Todavía no hay una ascensión documentada para esta cima.</p></div>`}
            </div>
          </section>
        </div>

        <aside class="detail-sidebar">
          <section class="detail-facts-card">
            <p class="eyebrow">Ficha</p>
            <dl>
              <div><dt>Macizo</dt><dd>${escapeHtml(summit.macizo || "—")}</dd></div>
              <div><dt>Zona UIAA</dt><dd>${escapeHtml(summit.zonaUIAA || "—")}</dd></div>
              <div><dt>País</dt><dd>${escapeHtml(summit.pais || "—")}</dd></div>
              <div><dt>Tipo</dt><dd>${escapeHtml(summit.tipo || "—")}</dd></div>
              <div><dt>Altitud</dt><dd>${summit.altitud || "—"} m</dd></div>
            </dl>
          </section>

          <section class="related-card">
            <p class="eyebrow">Mismo macizo</p>
            <h2>Otras cumbres</h2>
            <div>${relatedHtml(summit, db) || "<p>No hay otras cumbres relacionadas.</p>"}</div>
          </section>
        </aside>
      </section>
    `;

    renderMap(summit);
  } catch (error) {
    console.error(error);
    root.innerHTML = `<section class="detail-loading shell"><h1>Error al cargar la ficha</h1><p>${escapeHtml(error.message)}</p></section>`;
  }
}

start();
