import { loadGr11RawData } from "./data.js";
import { buildGr11Database } from "./db.js";
import { escapeHtml, etapaUrl, gpxUrl, statusLabel, numberText } from "./gr11-shared.js";
import { loadGPX, haversineKm } from "./gpx-engine.js";

const params = new URLSearchParams(location.search);
const id = String(params.get("id") || "").toUpperCase();

function external(url, label) {
  return url ? `<a class="primary-button compact" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>` : "";
}

function infoRow(label, value) {
  return value ? `<div class="gr11-info-row"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>` : "";
}

function renderRefuge(refuge) {
  if (!refuge) return `<p>No hay alojamiento asociado.</p>`;
  const contact = [refuge.telefono, refuge.telefono2, refuge.email].filter(Boolean).join(" · ");
  return `
    <div class="gr11-refuge-head">
      <div><p class="eyebrow">Final de etapa</p><h2>${escapeHtml(refuge.nombre)}</h2><p>${escapeHtml(refuge.tipo || "Alojamiento")} · ${escapeHtml(refuge.localidad || "")}</p></div>
      <span class="gr11-refuge-altitude">${numberText(refuge.altitud, " m")}</span>
    </div>
    <div class="gr11-refuge-grid">
      ${infoRow("Contacto", contact)}
      ${infoRow("Apertura", refuge.abierto)}
      ${infoRow("Plazas", refuge.plazas)}
      ${infoRow("Servicios", refuge.servicios)}
    </div>
    ${refuge.observaciones ? `<p class="gr11-long-text">${escapeHtml(refuge.observaciones)}</p>` : ""}
    <div class="gr11-actions">${external(refuge.web, "Web")}${external(refuge.reservasUrl, "Reservar")}${external(refuge.mapsUrl, "Mapa")}</div>`;
}


function refugePopup(refuge, roleLabel) {
  if (!refuge) return "";
  const contact = [refuge.telefono, refuge.telefono2, refuge.email].filter(Boolean).join(" · ");
  const links = [
    refuge.web ? `<a href="${escapeHtml(refuge.web)}" target="_blank" rel="noopener noreferrer">Web ↗</a>` : "",
    refuge.reservasUrl ? `<a href="${escapeHtml(refuge.reservasUrl)}" target="_blank" rel="noopener noreferrer">Reservar ↗</a>` : "",
    refuge.mapsUrl ? `<a href="${escapeHtml(refuge.mapsUrl)}" target="_blank" rel="noopener noreferrer">Mapa ↗</a>` : ""
  ].filter(Boolean).join("");
  return `
    <div class="gr11-refuge-popup">
      <p class="eyebrow">${escapeHtml(roleLabel)}</p>
      <strong>${escapeHtml(refuge.nombre)}</strong>
      <span>${escapeHtml(refuge.tipo || "Alojamiento")}${refuge.altitud ? ` · ${Math.round(refuge.altitud)} m` : ""}</span>
      ${refuge.guardado ? `<small><b>Guardado:</b> ${escapeHtml(refuge.guardado)}</small>` : ""}
      ${refuge.abierto ? `<small><b>Apertura:</b> ${escapeHtml(refuge.abierto)}</small>` : ""}
      ${contact ? `<small><b>Contacto:</b> ${escapeHtml(contact)}</small>` : ""}
      ${refuge.servicios ? `<small><b>Servicios:</b> ${escapeHtml(refuge.servicios)}</small>` : ""}
      ${links ? `<div class="gr11-refuge-popup__links">${links}</div>` : ""}
    </div>`;
}

function refugeIcon(refuge, role) {
  const type = String(refuge?.tipo || "").toLowerCase();
  let symbol = "⌂";
  if (type.includes("vivac") || type.includes("camping")) symbol = "△";
  else if (type.includes("sin alojamiento")) symbol = "⚑";
  else if (type.includes("hotel") || type.includes("hostal") || type.includes("pensión") || type.includes("apart") || type.includes("casa")) symbol = "▣";
  return window.L.divIcon({
    className: `gr11-refuge-map-icon gr11-refuge-map-icon--${role}`,
    html: `<span aria-hidden="true">${symbol}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -16]
  });
}

function createResetControl(map, fit) {
  const Control = window.L.Control.extend({
    options: { position: "topleft" },
    onAdd() {
      const container = window.L.DomUtil.create("div", "leaflet-bar gr11-reset-control");
      const button = window.L.DomUtil.create("button", "", container);
      button.type = "button";
      button.title = "Centrar recorrido";
      button.setAttribute("aria-label", "Centrar recorrido");
      button.innerHTML = `<span aria-hidden="true">↺</span><span>Centrar recorrido</span>`;
      window.L.DomEvent.disableClickPropagation(container);
      window.L.DomEvent.on(button, "click", fit);
      return container;
    }
  });
  new Control().addTo(map);
}

function renderElevationProfile(points, map) {
  const root = document.querySelector("#gr11-elevation-profile");
  if (!root) return null;
  const valid = points.filter((point) => Number.isFinite(point.ele));
  if (valid.length < 2) {
    root.innerHTML = '<p class="gr11-profile-empty">El GPX no contiene datos de altitud suficientes.</p>';
    return null;
  }

  const width = 1000;
  const height = 280;
  const margin = { top: 24, right: 28, bottom: 42, left: 58 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const totalDistance = valid[valid.length - 1].distance || 1;
  const minEleRaw = Math.min(...valid.map((p) => p.ele));
  const maxEleRaw = Math.max(...valid.map((p) => p.ele));
  const pad = Math.max(30, (maxEleRaw - minEleRaw) * 0.08);
  const minEle = Math.floor((minEleRaw - pad) / 50) * 50;
  const maxEle = Math.ceil((maxEleRaw + pad) / 50) * 50;
  const rangeEle = Math.max(1, maxEle - minEle);
  const x = (d) => margin.left + (d / totalDistance) * innerW;
  const y = (e) => margin.top + ((maxEle - e) / rangeEle) * innerH;
  const line = valid.map((p, i) => `${i ? "L" : "M"}${x(p.distance).toFixed(1)},${y(p.ele).toFixed(1)}`).join(" ");
  const area = `${line} L${x(totalDistance)},${margin.top + innerH} L${margin.left},${margin.top + innerH} Z`;
  const yTicks = Array.from({ length: 5 }, (_, i) => minEle + (rangeEle * i) / 4).reverse();
  const xTicks = Array.from({ length: 6 }, (_, i) => (totalDistance * i) / 5);

  root.innerHTML = `
    <div class="gr11-profile-summary" aria-hidden="true">
      <span><strong>${Math.round(minEleRaw)} m</strong>Mínima</span>
      <span><strong>${Math.round(maxEleRaw)} m</strong>Máxima</span>
      <span><strong>${totalDistance.toFixed(1)} km</strong>Track</span>
    </div>
    <svg class="gr11-profile-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Perfil altimétrico de la etapa">
      <g class="gr11-profile-grid">
        ${yTicks.map((tick) => `<line x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}"></line><text x="${margin.left - 10}" y="${y(tick) + 4}" text-anchor="end">${Math.round(tick)} m</text>`).join("")}
        ${xTicks.map((tick) => `<line x1="${x(tick)}" x2="${x(tick)}" y1="${margin.top}" y2="${margin.top + innerH}"></line><text x="${x(tick)}" y="${height - 12}" text-anchor="middle">${tick.toFixed(tick === 0 ? 0 : 1)} km</text>`).join("")}
      </g>
      <path class="gr11-profile-area" d="${area}"></path>
      <path class="gr11-profile-line" d="${line}"></path>
      <line class="gr11-profile-cursor" x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${margin.top + innerH}" hidden></line>
      <circle class="gr11-profile-point" r="7" cx="${margin.left}" cy="${y(valid[0].ele)}" hidden></circle>
      <rect class="gr11-profile-hit" x="${margin.left}" y="${margin.top}" width="${innerW}" height="${innerH}" fill="transparent"></rect>
    </svg>
    <div class="gr11-profile-tooltip" hidden aria-live="polite"></div>`;

  const svg = root.querySelector(".gr11-profile-svg");
  const hit = root.querySelector(".gr11-profile-hit");
  const cursor = root.querySelector(".gr11-profile-cursor");
  const dot = root.querySelector(".gr11-profile-point");
  const tooltip = root.querySelector(".gr11-profile-tooltip");
  const positionIcon = window.L.divIcon({
    className: "gr11-map-position-icon",
    html: '<span class="gr11-map-position-pulse" aria-hidden="true"></span><span class="gr11-map-position-dot" aria-hidden="true"></span>',
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
  const mapMarker = window.L.marker([valid[0].lat, valid[0].lon], {
    icon: positionIcon,
    interactive: false,
    keyboard: false,
    zIndexOffset: 2500
  });
  let lockedPoint = null;

  function nearestByDistance(distance) {
    let lo = 0;
    let hi = valid.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (valid[mid].distance < distance) lo = mid + 1;
      else hi = mid;
    }
    const left = Math.max(0, lo - 1);
    return Math.abs(valid[left].distance - distance) < Math.abs(valid[lo].distance - distance) ? valid[left] : valid[lo];
  }

  function nearestByLatLng(latlng) {
    let nearest = valid[0];
    let min = Infinity;
    valid.forEach((point) => {
      const d = haversineKm({ lat: latlng.lat, lon: latlng.lng }, point);
      if (d < min) { min = d; nearest = point; }
    });
    return nearest;
  }

  function showPoint(point, { lock = false, pan = false } = {}) {
    if (!point) return;
    if (lock) lockedPoint = point;
    const cx = x(point.distance);
    const cy = y(point.ele);
    cursor.hidden = false;
    dot.hidden = false;
    tooltip.hidden = false;
    cursor.setAttribute("x1", cx);
    cursor.setAttribute("x2", cx);
    dot.setAttribute("cx", cx);
    dot.setAttribute("cy", cy);
    tooltip.textContent = `${point.distance.toFixed(1)} km · ${Math.round(point.ele)} m`;
    tooltip.style.left = `${Math.max(12, Math.min(88, (cx / width) * 100))}%`;
    if (!map.hasLayer(mapMarker)) mapMarker.addTo(map);
    mapMarker.setLatLng([point.lat, point.lon]);
    mapMarker.bindTooltip(`${point.distance.toFixed(1)} km · ${Math.round(point.ele)} m`, {
      permanent: false,
      direction: "top",
      offset: [0, -18],
      className: "gr11-map-position-tooltip"
    }).openTooltip();
    if (pan) map.panTo([point.lat, point.lon], { animate: true, duration: .35 });
  }

  function clearTransient() {
    if (lockedPoint) { showPoint(lockedPoint); return; }
    cursor.hidden = true;
    dot.hidden = true;
    tooltip.hidden = true;
    if (map.hasLayer(mapMarker)) map.removeLayer(mapMarker);
  }

  function pointFromProfileEvent(event) {
    const rect = svg.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const clamped = Math.max(margin.left, Math.min(width - margin.right, px));
    const distance = ((clamped - margin.left) / innerW) * totalDistance;
    return nearestByDistance(distance);
  }

  hit.addEventListener("pointermove", (event) => showPoint(pointFromProfileEvent(event)));
  hit.addEventListener("pointerleave", clearTransient);
  hit.addEventListener("click", (event) => showPoint(pointFromProfileEvent(event), { lock: true, pan: true }));

  return {
    selectLatLng(latlng) { showPoint(nearestByLatLng(latlng), { lock: true, pan: false }); },
    clearSelection() { lockedPoint = null; clearTransient(); }
  };
}

function formatMetric(value, decimals = 0, suffix = "") {
  return Number.isFinite(value) ? `${value.toFixed(decimals)}${suffix}` : "—";
}

function setupFullscreenMap(map, fit, stage) {
  const openButton = document.querySelector("#gr11-expand-map");
  const mapElement = document.querySelector("#gr11-stage-map");
  const host = document.querySelector("#gr11-stage-map-host");
  if (!openButton || !mapElement || !host) return;

  const placeholder = document.createComment("gr11 map original position");
  host.insertBefore(placeholder, mapElement);
  const modal = document.createElement("div");
  modal.className = "gr11-map-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="gr11-map-modal__toolbar">
      <div class="gr11-map-modal__context">
        <span>${escapeHtml(stage.id)} · ${numberText(stage.distancia, " km")}</span>
        <strong>${escapeHtml(stage.inicio)} → ${escapeHtml(stage.final)}</strong>
      </div>
      <div>
        <button type="button" class="gr11-map-tool" data-action="fit">↺ Centrar recorrido</button>
        <button type="button" class="gr11-map-tool gr11-map-tool--close" data-action="close">Cerrar ×</button>
      </div>
    </div>
    <div class="gr11-map-modal__body"></div>`;
  document.body.appendChild(modal);
  const modalBody = modal.querySelector(".gr11-map-modal__body");

  const close = () => {
    if (modal.hidden) return;
    placeholder.parentNode.insertBefore(mapElement, placeholder.nextSibling);
    modal.hidden = true;
    document.body.classList.remove("gr11-map-open");
    openButton.focus();
    requestAnimationFrame(() => {
      map.invalidateSize();
      fit();
    });
  };

  openButton.addEventListener("click", () => {
    modal.hidden = false;
    document.body.classList.add("gr11-map-open");
    modalBody.appendChild(mapElement);
    requestAnimationFrame(() => {
      map.invalidateSize();
      fit();
    });
    modal.querySelector('[data-action="close"]').focus();
  });
  modal.querySelector('[data-action="fit"]').addEventListener("click", fit);
  modal.querySelector('[data-action="close"]').addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) close();
  });
}

async function renderStageMap(stage, startRefuge = null, track = null) {
  const element = document.querySelector("#gr11-stage-map");
  if (!element) return;

  if (typeof window.L === "undefined") {
    element.innerHTML = '<p class="gr11-map-error">No se pudo iniciar Leaflet.</p>';
    return;
  }

  const trackUrl = gpxUrl(stage.trackReferencia);
  if (!trackUrl) {
    element.innerHTML = '<p class="gr11-map-error">Esta etapa no tiene un GPX asociado.</p>';
    return;
  }

  let map;
  try {
    element.replaceChildren();
    map = window.L.map(element, { zoomControl: true, scrollWheelZoom: true });

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    const resolvedTrack = track || await loadGPX(trackUrl);
    const { segments, points } = resolvedTrack;

    // Dibujamos el track en un pane propio y con doble trazo para que sea
    // claramente visible sobre cualquier cartografía (bosque, carreteras, curvas, etc.).
    if (!map.getPane("gr11TrackCasing")) {
      const casingPane = map.createPane("gr11TrackCasing");
      casingPane.style.zIndex = "640";
      casingPane.style.pointerEvents = "none";
    }
    if (!map.getPane("gr11TrackMain")) {
      const mainPane = map.createPane("gr11TrackMain");
      mainPane.style.zIndex = "650";
    }

    const group = window.L.featureGroup().addTo(map);
    const color = stage.estado === "realizada" ? "#16834f" : stage.estado === "planificada" ? "#e6a100" : "#d83b32";

    const trackLines = [];
    segments.forEach((segment) => {
      const latlngs = segment.map((p) => [p.lat, p.lon]);
      window.L.polyline(latlngs, {
        pane: "gr11TrackCasing", color: "#ffffff", weight: 11, opacity: 0.9,
        lineCap: "round", lineJoin: "round", interactive: false
      }).addTo(map);
      const line = window.L.polyline(latlngs, {
        pane: "gr11TrackMain", color, weight: 7, opacity: 1,
        lineCap: "round", lineJoin: "round"
      }).addTo(group);
      trackLines.push(line);
    });

    const first = segments[0][0];
    const finalSegment = segments[segments.length - 1];
    const last = finalSegment[finalSegment.length - 1];

    if (startRefuge) {
      window.L.marker([first.lat, first.lon], { icon: refugeIcon(startRefuge, "start"), zIndexOffset: 900 })
        .bindPopup(refugePopup(startRefuge, "Alojamiento de inicio"), { className: "gr11-refuge-leaflet-popup", maxWidth: 330 })
        .bindTooltip(`Inicio · ${startRefuge.nombre}`)
        .addTo(map);
    } else {
      window.L.circleMarker([first.lat, first.lon], { radius: 7, color: "#173d30", fillColor: "#fff", fillOpacity: 1, weight: 3 })
        .bindTooltip(`Inicio · ${stage.inicio}`).addTo(map);
    }

    if (stage.refugio) {
      window.L.marker([last.lat, last.lon], { icon: refugeIcon(stage.refugio, "finish"), zIndexOffset: 1000 })
        .bindPopup(refugePopup(stage.refugio, "Alojamiento final"), { className: "gr11-refuge-leaflet-popup", maxWidth: 330 })
        .bindTooltip(`Final · ${stage.refugio.nombre}`)
        .addTo(map);
    } else {
      window.L.circleMarker([last.lat, last.lon], { radius: 7, color: "#8f241f", fillColor: "#fff", fillOpacity: 1, weight: 3 })
        .bindTooltip(`Final · ${stage.final}`).addTo(map);
    }

    const bounds = group.getBounds();
    if (!bounds.isValid()) throw new Error("Los límites del track no son válidos");
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [34, 34], maxZoom: 14 });
    };
    createResetControl(map, fit);
    requestAnimationFrame(fit);
    setTimeout(fit, 180);

    const profileController = renderElevationProfile(points, map);
    trackLines.forEach((line) => {
      line.on("click", (event) => profileController?.selectLatLng(event.latlng));
      line.bindTooltip("Pulsa para localizar este punto en el perfil", { sticky: true, opacity: .9 });
    });
    setupFullscreenMap(map, fit, stage);
  } catch (error) {
    console.error("No se pudo cargar el mapa de la etapa", error);
    if (map) map.remove();
    element.innerHTML = `
      <div class="gr11-map-error">
        <strong>No se pudo cargar el mapa de esta etapa.</strong>
        <span>${escapeHtml(error.message || String(error))}</span>
        <span>Archivo esperado: <code>${escapeHtml(trackUrl)}</code></span>
      </div>`;
  }
}

async function start() {
  const root = document.querySelector("#gr11-stage-detail");
  try {
    const DB = buildGr11Database(await loadGr11RawData());
    const stage = DB.indexes.etapasById.get(id) || DB.etapas[0];
    if (!stage) throw new Error("No hay etapas disponibles.");
    const trackUrl = gpxUrl(stage.trackReferencia);
    if (!trackUrl) throw new Error("Esta etapa no tiene un GPX asociado.");
    const track = await loadGPX(trackUrl);
    document.title = `${stage.nombre} · GR11`;
    const index = DB.etapas.findIndex((item) => item.id === stage.id);
    const previous = DB.etapas[index - 1];
    const next = DB.etapas[index + 1];
    root.innerHTML = `
      <section class="gr11-detail-hero">
        <div class="shell">
          <nav class="breadcrumbs" aria-label="Migas de pan"><a href="index.html">Inicio</a><span>/</span><a href="gr11.html">GR11</a><span>/</span><span>${escapeHtml(stage.id)}</span></nav>
          <div class="gr11-detail-title-row"><div><p class="eyebrow">Etapa ${stage.numero}</p><h1>${escapeHtml(stage.nombre)}</h1><p>${escapeHtml(stage.inicio)} → ${escapeHtml(stage.final)}</p></div><span class="gr11-status ${stage.estado}">${statusLabel(stage.estado)}</span></div>
          <div class="gr11-detail-stats">
            <div><strong>${formatMetric(track.distanceKm, 1, " km")}</strong><span>Distancia</span></div>
            <div><strong>${formatMetric(track.elevationGain, 0, " m+")}</strong><span>Ascenso</span></div>
            <div><strong>${formatMetric(track.elevationLoss, 0, " m−")}</strong><span>Descenso</span></div>
            <div><strong>${formatMetric(track.minElevation, 0, " m")}</strong><span>Altitud mínima</span></div>
            <div><strong>${formatMetric(track.maxElevation, 0, " m")}</strong><span>Altitud máxima</span></div>
            <div><strong>${escapeHtml(stage.tiempoEstimado || "—")}</strong><span>Tiempo</span></div>
            <div><strong>${escapeHtml(stage.dificultad || "—")}</strong><span>Dificultad</span></div>
          </div>
        </div>
      </section>
      <section class="shell gr11-detail-layout">
        <article class="gr11-detail-main">
          <section><p class="eyebrow">La etapa</p><h2>Recorrido</h2><p class="gr11-long-text">${escapeHtml(stage.descripcion || "Sin descripción.")}</p>${stage.observaciones ? `<div class="gr11-note"><strong>Conviene saber</strong><p>${escapeHtml(stage.observaciones)}</p></div>` : ""}</section>
          <section class="gr11-track-panel">
            <div class="gr11-track-panel__head">
              <div><p class="eyebrow">Cartografía</p><h2>Track y mapa</h2><p>Explora con detalle el recorrido de esta etapa y descarga su GPX de referencia.</p></div>
              <div class="gr11-actions">
                <button id="gr11-expand-map" class="primary-button compact" type="button">Ampliar mapa ↗</button>
                ${external(gpxUrl(stage.trackReferencia), "Descargar GPX")}${external(stage.mapaUrl, "Ver mapa")}
              </div>
            </div>
            <div id="gr11-stage-map-host" class="gr11-stage-map-host"><div id="gr11-stage-map" class="gr11-stage-map" aria-label="Mapa de la etapa ${escapeHtml(stage.id)}"></div></div>
            <section class="gr11-profile-panel" aria-labelledby="gr11-profile-title">
              <div class="gr11-profile-heading"><div><p class="eyebrow">Altimetría</p><h3 id="gr11-profile-title">Perfil de la etapa</h3></div><p>Mueve el cursor o pulsa sobre el perfil. También puedes pulsar directamente sobre el recorrido del mapa.</p></div>
              <div id="gr11-elevation-profile" class="gr11-elevation-profile"></div>
              <p class="gr11-gpx-source-note">Distancia, desnivel y altitudes calculados a partir del GPX de referencia.</p>
            </section>
          </section>
          <section class="gr11-refuge-panel">${renderRefuge(stage.refugio)}</section>
        </article>
        <aside class="gr11-stage-nav" aria-label="Navegación entre etapas">
          <a class="${previous ? "" : "is-disabled"}" href="${previous ? etapaUrl(previous) : "#"}">← <span>Anterior</span>${previous ? `<strong>${escapeHtml(previous.nombre)}</strong>` : ""}</a>
          <a class="${next ? "" : "is-disabled"}" href="${next ? etapaUrl(next) : "#"}"><span>Siguiente</span> →${next ? `<strong>${escapeHtml(next.nombre)}</strong>` : ""}</a>
          <a href="gr11.html#etapas">Ver todas las etapas</a>
        </aside>
      </section>`;
    await renderStageMap(stage, previous?.refugio ?? null, track);
  } catch (error) {
    root.innerHTML = `<section class="shell archive-section"><h1>No se pudo cargar la etapa</h1><p>${escapeHtml(error.message)}</p><a href="gr11.html">Volver a GR11</a></section>`;
  }
}
start();
