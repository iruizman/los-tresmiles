import { loadGr11RawData } from "./data.js";
import { buildGr11Database } from "./db.js";
import { escapeHtml, etapaUrl, gpxUrl, statusLabel, numberText } from "./gr11-shared.js";
import { GPXEngine } from "./gpx-engine.js";

let DB;
let map;
let refugeLayer;
let trackLayer;
let endpointLayer;
let fullRouteBounds;
const layerByStageId = new Map();
let selectedStageId = "";
const draftCampaigns = [];
let campaignStep = 1;
let campaignStageId = "";
let campaignLastFocus = null;
let campaignPreviewToken = 0;

const els = {
  status: document.querySelector("#gr11-status"),
  summary: document.querySelector("#gr11-summary"),
  stats: document.querySelector("#gr11-stats"),
  grid: document.querySelector("#gr11-stage-grid"),
  count: document.querySelector("#gr11-count"),
  search: document.querySelector("#gr11-search"),
  state: document.querySelector("#gr11-state"),
  difficulty: document.querySelector("#gr11-difficulty"),
  reset: document.querySelector("#gr11-reset"),
  mapMessage: document.querySelector("#gr11-map-message"),
  campaignList: document.querySelector("#gr11-campaign-list"),
  newCampaign: document.querySelector("#gr11-new-campaign"),
  campaignModal: document.querySelector("#gr11-campaign-modal"),
  campaignForm: document.querySelector("#gr11-campaign-form"),
  campaignName: document.querySelector("#campaign-name"),
  campaignDate: document.querySelector("#campaign-date"),
  campaignStageSearch: document.querySelector("#campaign-stage-search"),
  campaignStageOptions: document.querySelector("#campaign-stage-options"),
  campaignDays: document.querySelector("#campaign-days"),
  campaignDaysWarning: document.querySelector("#campaign-days-warning"),
  campaignPreview: document.querySelector("#campaign-preview"),
  campaignPreviewLoading: document.querySelector("#campaign-preview-loading"),
  campaignBack: document.querySelector("#campaign-back"),
  campaignNext: document.querySelector("#campaign-next"),
  campaignCreate: document.querySelector("#campaign-create")
};

function initMap() {
  map = L.map("gr11-map", { zoomControl: true, scrollWheelZoom: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  refugeLayer = L.layerGroup().addTo(map);
  trackLayer = L.layerGroup().addTo(map);
  endpointLayer = L.layerGroup().addTo(map);

  const isNarrow = window.matchMedia("(max-width: 700px)").matches;
  map.setView([42.64, 0.72], isNarrow ? 7 : 8);
  requestAnimationFrame(() => map.invalidateSize());
}

function trackColor(status) {
  return { realizada: "#1f6b48", planificada: "#d79a22", pendiente: "#c4473d" }[status] ?? "#c4473d";
}

function defaultTrackStyle(stage) {
  return { color: trackColor(stage.estado), weight: 5, opacity: 0.82, lineCap: "round", lineJoin: "round" };
}

function parseTrackSegments(xml) {
  const segments = [...xml.querySelectorAll("trkseg")]
    .map((segment) => [...segment.querySelectorAll("trkpt")]
      .map((point) => [Number(point.getAttribute("lat")), Number(point.getAttribute("lon"))])
      .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon)))
    .filter((points) => points.length > 1);

  if (segments.length) return segments;

  const route = [...xml.querySelectorAll("rtept")]
    .map((point) => [Number(point.getAttribute("lat")), Number(point.getAttribute("lon"))])
    .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
  return route.length > 1 ? [route] : [];
}

function popupHtml(stage) {
  return `<div class="gr11-map-popup">
    <span class="gr11-status ${stage.estado}">${statusLabel(stage.estado)}</span>
    <strong>${escapeHtml(stage.id)} · ${escapeHtml(stage.nombre)}</strong>
    <span>${escapeHtml(stage.inicio)} → ${escapeHtml(stage.final)}</span>
    <small>${numberText(stage.distanciaKm, " km")} · ${numberText(stage.desnivelPos, " m+")} · ${escapeHtml(stage.tiempoEstimado || "—")}</small>
    <a href="${etapaUrl(stage)}">Ver ficha completa →</a>
  </div>`;
}

async function loadTrack(stage) {
  const url = gpxUrl(stage.trackReferencia);
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
    if (xml.querySelector("parsererror")) throw new Error("GPX no válido");

    const segments = parseTrackSegments(xml);
    if (!segments.length) throw new Error("GPX sin puntos de track");

    const group = L.featureGroup().addTo(trackLayer);
    segments.forEach((points) => {
      const line = L.polyline(points, defaultTrackStyle(stage)).addTo(group);
      line.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        selectStage(stage.id, { fit: false, openPopup: true });
      });
      line.on("mouseover", () => highlightStage(stage.id));
      line.on("mouseout", () => { if (selectedStageId !== stage.id) resetTrackStyles(); });
    });

    group.bindTooltip(`${stage.id} · ${stage.nombre}`, { sticky: true });
    group.bindPopup(popupHtml(stage), { maxWidth: 320, className: "gr11-leaflet-popup" });
    layerByStageId.set(stage.id, group);
    return { bounds: group.getBounds(), first: segments[0][0], last: segments.at(-1).at(-1) };
  } catch (error) {
    console.warn(`${stage.id}: no se pudo cargar ${url}`, error);
    return null;
  }
}

function renderEndpoints(loadedTracks) {
  endpointLayer.clearLayers();
  if (!loadedTracks.length) return;
  const first = loadedTracks[0];
  const last = loadedTracks.at(-1);
  const markerOptions = { radius: 7, color: "#173d30", fillColor: "#fff", fillOpacity: 1, weight: 3 };
  L.circleMarker(first.first, markerOptions).bindTooltip("Inicio · Cabo Higuer", { permanent: false }).addTo(endpointLayer);
  L.circleMarker(last.last, markerOptions).bindTooltip("Final · Cap de Creus", { permanent: false }).addTo(endpointLayer);
}

async function renderTracks() {
  trackLayer.clearLayers();
  endpointLayer.clearLayers();
  layerByStageId.clear();
  fullRouteBounds = null;

  const results = await Promise.all(DB.etapas.map(loadTrack));
  const loaded = results.filter(Boolean);
  if (loaded.length) {
    fullRouteBounds = loaded.reduce((acc, item) => acc.extend(item.bounds), L.latLngBounds(loaded[0].bounds));
    map.fitBounds(fullRouteBounds, { padding: [32, 32] });
    renderEndpoints(loaded);
  }
  return loaded.length;
}

function renderStats() {
  const s = DB.stats;
  els.stats.innerHTML = [
    [s.total, "Etapas"],
    [s.realizadas, "Realizadas"],
    [s.planificadas, "Planificadas"],
    [s.pendientes, "Pendientes"]
  ].map(([value, label]) => `<article class="gr11-stat"><strong>${value}</strong><span>${label}</span></article>`).join("");
  els.summary.textContent = `${s.total} etapas entre el Cantábrico y el Mediterráneo.`;
}

function populateFilters() {
  [...new Set(DB.etapas.map((item) => item.dificultad).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach((value) => els.difficulty.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`));
}

function filteredStages() {
  const q = els.search.value.trim().toLowerCase();
  return DB.etapas.filter((stage) => {
    const haystack = `${stage.id} ${stage.nombre} ${stage.inicio} ${stage.final}`.toLowerCase();
    return (!q || haystack.includes(q))
      && (!els.state.value || stage.estado === els.state.value)
      && (!els.difficulty.value || stage.dificultad === els.difficulty.value);
  });
}

function stageCard(stage) {
  return `
    <article class="gr11-stage-card ${selectedStageId === stage.id ? "is-selected" : ""}" data-stage-id="${stage.id}">
      <div class="gr11-stage-card__top">
        <span class="gr11-stage-number">${escapeHtml(stage.id)}</span>
        <span class="gr11-status ${stage.estado}">${statusLabel(stage.estado)}</span>
      </div>
      <h3>${escapeHtml(stage.nombre)}</h3>
      <p class="gr11-route">${escapeHtml(stage.inicio)} <span aria-hidden="true">→</span> ${escapeHtml(stage.final)}</p>
      <div class="gr11-stage-facts">
        <span><strong>${numberText(stage.distanciaKm, " km")}</strong> distancia</span>
        <span><strong>${numberText(stage.desnivelPos, " m+")}</strong> desnivel</span>
        <span><strong>${escapeHtml(stage.tiempoEstimado || "—")}</strong> tiempo</span>
      </div>
      <a class="gr11-card-link" href="${etapaUrl(stage)}">Ver ficha completa →</a>
    </article>`;
}

function renderStages() {
  const stages = filteredStages();
  els.count.textContent = `${stages.length} ${stages.length === 1 ? "etapa" : "etapas"}`;
  els.grid.innerHTML = stages.map(stageCard).join("") || `<p class="archive-empty">No hay etapas que coincidan con los filtros.</p>`;
  els.grid.querySelectorAll("[data-stage-id]").forEach((card) => {
    card.addEventListener("mouseenter", () => highlightStage(card.dataset.stageId));
    card.addEventListener("mouseleave", resetTrackStyles);
    card.addEventListener("focusin", () => highlightStage(card.dataset.stageId));
    card.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      selectStage(card.dataset.stageId);
    });
  });
}

function resetTrackStyles() {
  layerByStageId.forEach((group, id) => {
    const stage = DB.indexes.etapasById.get(id);
    group.setStyle(id === selectedStageId
      ? { ...defaultTrackStyle(stage), weight: 8, opacity: 1 }
      : defaultTrackStyle(stage));
  });
}

function highlightStage(id) {
  const group = layerByStageId.get(id);
  if (!group) return;
  resetTrackStyles();
  group.setStyle({ weight: 8, opacity: 1 });
  group.bringToFront();
}

function selectStage(id, options = {}) {
  const { fit = true, openPopup = false } = options;
  selectedStageId = id;
  const stage = DB.indexes.etapasById.get(id);
  if (!stage) return;

  document.querySelectorAll(".gr11-stage-card").forEach((card) => card.classList.toggle("is-selected", card.dataset.stageId === id));

  resetTrackStyles();
  const group = layerByStageId.get(id);
  if (group) {
    group.setStyle({ weight: 8, opacity: 1 });
    group.bringToFront();
    if (fit) map.fitBounds(group.getBounds(), { padding: [42, 42], maxZoom: 12 });
    if (openPopup) group.openPopup(group.getBounds().getCenter());
    return;
  }

  const refuge = stage.refugio;
  if (refuge?.latitud !== null && refuge?.longitud !== null) {
    map.flyTo([refuge.latitud, refuge.longitud], 11, { duration: 0.6 });
  }
}

function renderRefuges() {
  refugeLayer.clearLayers();
  DB.refugios.forEach((refuge) => {
    if (refuge.latitud === null || refuge.longitud === null) return;
    const marker = L.circleMarker([refuge.latitud, refuge.longitud], {
      radius: 5.5, color: "#1f4d3a", fillColor: "#f2a65a", fillOpacity: 0.9, weight: 2
    }).addTo(refugeLayer);
    marker.bindPopup(`<strong>${escapeHtml(refuge.nombre)}</strong><br>${escapeHtml(refuge.tipo || "Alojamiento")} · ${numberText(refuge.altitud, " m")}`);
  });
}

function resetMapView() {
  selectedStageId = "";
  resetTrackStyles();
  document.querySelectorAll(".gr11-stage-card").forEach((card) => card.classList.remove("is-selected"));
  if (fullRouteBounds) map.fitBounds(fullRouteBounds, { padding: [32, 32] });
  map.closePopup();
}


function localDateFromInput(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCampaignDate(date, options = {}) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: options.year === false ? undefined : "numeric"
  }).format(date);
}

function suggestedCampaignName(date) {
  if (!date) return "GR11 · Nueva campaña";
  const month = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(date);
  return `GR11 · ${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

function parseDurationMinutes(text) {
  const value = String(text || "").toLowerCase();
  const hours = Number(value.match(/(\d+(?:[.,]\d+)?)\s*h/)?.[1]?.replace(",", ".") || 0);
  const minutes = Number(value.match(/(\d+)\s*min/)?.[1] || 0);
  return Math.round(hours * 60 + minutes);
}

function durationText(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "—";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

function campaignSelection() {
  const startIndex = DB.etapas.findIndex((stage) => stage.id === campaignStageId);
  const requested = Math.max(1, Number(els.campaignDays.value) || 1);
  if (startIndex < 0) return [];
  return DB.etapas.slice(startIndex, startIndex + requested);
}

function renderCampaigns() {
  if (!draftCampaigns.length) {
    els.campaignList.innerHTML = `<div class="gr11-campaign-empty">
      <div><strong>Todavía no tienes campañas creadas.</strong><p>Cuando prepares una, aparecerá aquí con sus jornadas y alojamientos.</p></div>
      <button class="secondary-button" type="button" data-open-campaign>Crear la primera →</button>
    </div>`;
  } else {
    els.campaignList.innerHTML = draftCampaigns.map((campaign) => `
      <article class="gr11-campaign-card">
        <div class="gr11-campaign-card__top">
          <span class="gr11-status planificada">Planificada</span>
          <small>Provisional · esta sesión</small>
        </div>
        <h3>${escapeHtml(campaign.name)}</h3>
        <p>${formatCampaignDate(campaign.startDate)} · ${campaign.stages.length} ${campaign.stages.length === 1 ? "jornada" : "jornadas"}</p>
        <div class="gr11-campaign-card__route"><strong>${escapeHtml(campaign.stages[0].inicio)}</strong><span>→</span><strong>${escapeHtml(campaign.stages.at(-1).final)}</strong></div>
        <div class="gr11-campaign-card__facts">
          <span><strong>${campaign.totals.distance.toFixed(1)} km</strong> distancia</span>
          <span><strong>${Math.round(campaign.totals.gain)} m+</strong> ascenso</span>
          <span><strong>${durationText(campaign.totals.minutes)}</strong> tiempo</span>
        </div>
      </article>`).join("");
  }
  els.campaignList.querySelectorAll("[data-open-campaign]").forEach((button) => button.addEventListener("click", openCampaignWizard));
}

function resetCampaignWizard() {
  campaignStep = 1;
  campaignStageId = DB?.etapas?.[0]?.id || "";
  const defaultDate = addDays(new Date(), 1);
  els.campaignDate.value = dateInputValue(defaultDate);
  els.campaignName.value = suggestedCampaignName(defaultDate);
  els.campaignStageSearch.value = "";
  els.campaignDays.value = "4";
  els.campaignDaysWarning.hidden = true;
  renderCampaignStageOptions();
  showCampaignStep(1);
}

function openCampaignWizard() {
  campaignLastFocus = document.activeElement;
  resetCampaignWizard();
  els.campaignModal.hidden = false;
  document.body.classList.add("gr11-campaign-open");
  requestAnimationFrame(() => els.campaignName.focus());
}

function closeCampaignWizard() {
  els.campaignModal.hidden = true;
  document.body.classList.remove("gr11-campaign-open");
  campaignLastFocus?.focus?.();
}

function showCampaignStep(step) {
  campaignStep = step;
  els.campaignModal.querySelectorAll("[data-step]").forEach((section) => {
    const active = Number(section.dataset.step) === step;
    section.hidden = !active;
    section.classList.toggle("is-active", active);
  });
  els.campaignModal.querySelectorAll("[data-step-dot]").forEach((dot) => {
    const number = Number(dot.dataset.stepDot);
    dot.classList.toggle("is-active", number === step);
    dot.classList.toggle("is-complete", number < step);
  });
  els.campaignBack.hidden = step === 1;
  els.campaignNext.hidden = step === 5;
  els.campaignCreate.hidden = step !== 5;

  if (step === 3) renderCampaignStageOptions();
  if (step === 4) validateCampaignDays();
  if (step === 5) renderCampaignPreview();
}

function renderCampaignStageOptions() {
  const query = els.campaignStageSearch.value.trim().toLowerCase();
  const stages = DB.etapas.filter((stage) => `${stage.id} ${stage.nombre} ${stage.inicio} ${stage.final}`.toLowerCase().includes(query));
  els.campaignStageOptions.innerHTML = stages.map((stage) => `
    <button type="button" class="gr11-campaign-stage-option ${stage.id === campaignStageId ? "is-selected" : ""}" data-campaign-stage="${stage.id}" role="option" aria-selected="${stage.id === campaignStageId}">
      <span><strong>${escapeHtml(stage.id)}</strong>${escapeHtml(stage.nombre)}</span>
      <small>${escapeHtml(stage.inicio)} → ${escapeHtml(stage.final)}</small>
    </button>`).join("") || `<p class="gr11-campaign-no-results">No se ha encontrado ninguna etapa.</p>`;
  els.campaignStageOptions.querySelectorAll("[data-campaign-stage]").forEach((button) => {
    button.addEventListener("click", () => {
      campaignStageId = button.dataset.campaignStage;
      renderCampaignStageOptions();
    });
  });
}

function validateCampaignDays() {
  const startIndex = DB.etapas.findIndex((stage) => stage.id === campaignStageId);
  const maxDays = startIndex >= 0 ? DB.etapas.length - startIndex : 0;
  const requested = Math.max(1, Number(els.campaignDays.value) || 1);
  els.campaignDays.max = String(Math.max(1, maxDays));
  if (requested > maxDays) {
    els.campaignDaysWarning.textContent = `Desde ${campaignStageId} solo quedan ${maxDays} etapas. Ajustaremos la campaña a ${maxDays} jornadas.`;
    els.campaignDaysWarning.hidden = false;
    els.campaignDays.value = String(maxDays);
  } else {
    els.campaignDaysWarning.hidden = true;
  }
}

function validateCampaignStep() {
  if (campaignStep === 1 && !els.campaignName.value.trim()) {
    els.campaignName.focus();
    return false;
  }
  if (campaignStep === 2 && !localDateFromInput(els.campaignDate.value)) {
    els.campaignDate.focus();
    return false;
  }
  if (campaignStep === 3 && !campaignStageId) return false;
  if (campaignStep === 4) {
    validateCampaignDays();
    return Number(els.campaignDays.value) > 0;
  }
  return true;
}

async function stageMetrics(stage) {
  try {
    const track = await GPXEngine.load(gpxUrl(stage.trackReferencia));
    return {
      distance: track.distanceKm,
      gain: Number.isFinite(track.elevationGain) ? track.elevationGain : 0,
      loss: Number.isFinite(track.elevationLoss) ? track.elevationLoss : 0
    };
  } catch (error) {
    console.warn(`No se pudieron calcular las métricas de ${stage.id}`, error);
    return {
      distance: Number(stage.distanciaKm) || 0,
      gain: Number(stage.desnivelPos) || 0,
      loss: Number(stage.desnivelNeg) || 0
    };
  }
}

async function renderCampaignPreview() {
  const token = ++campaignPreviewToken;
  const stages = campaignSelection();
  const startDate = localDateFromInput(els.campaignDate.value);
  els.campaignPreviewLoading.hidden = false;
  els.campaignPreview.innerHTML = `<p class="gr11-campaign-preview-placeholder">Preparando jornadas y leyendo los GPX…</p>`;
  const metrics = await Promise.all(stages.map(stageMetrics));
  if (token !== campaignPreviewToken) return;

  const totals = stages.reduce((acc, stage, index) => {
    acc.distance += metrics[index].distance;
    acc.gain += metrics[index].gain;
    acc.loss += metrics[index].loss;
    acc.minutes += parseDurationMinutes(stage.tiempoEstimado);
    return acc;
  }, { distance: 0, gain: 0, loss: 0, minutes: 0 });

  els.campaignPreviewLoading.hidden = true;
  els.campaignPreview.innerHTML = `
    <div class="gr11-campaign-preview-summary">
      <div><span>Campaña</span><strong>${escapeHtml(els.campaignName.value.trim())}</strong></div>
      <div><span>Recorrido</span><strong>${escapeHtml(stages[0]?.inicio || "—")} → ${escapeHtml(stages.at(-1)?.final || "—")}</strong></div>
    </div>
    <div class="gr11-campaign-itinerary">
      ${stages.map((stage, index) => {
        const refuge = stage.refugio;
        const date = addDays(startDate, index);
        return `<article class="gr11-campaign-day">
          <div class="gr11-campaign-day__date"><span>Día ${index + 1}</span><strong>${formatCampaignDate(date, { year: false })}</strong></div>
          <div class="gr11-campaign-day__main">
            <span class="gr11-campaign-day__id">${escapeHtml(stage.id)}</span>
            <h4>${escapeHtml(stage.nombre)}</h4>
            <p>${escapeHtml(stage.inicio)} → ${escapeHtml(stage.final)}</p>
            <div class="gr11-campaign-day__facts">
              <span>${metrics[index].distance.toFixed(1)} km</span>
              <span>${Math.round(metrics[index].gain)} m+</span>
              <span>${escapeHtml(stage.tiempoEstimado || "—")}</span>
            </div>
          </div>
          <div class="gr11-campaign-day__stay">
            <span>Alojamiento previsto</span>
            <strong>${escapeHtml(refuge?.nombre || "Sin alojamiento definido")}</strong>
            <small>${escapeHtml(refuge?.tipo || "")} ${refuge?.abierto ? `· ${escapeHtml(refuge.abierto)}` : ""}</small>
            ${refuge?.reservasUrl ? `<a href="${escapeHtml(refuge.reservasUrl)}" target="_blank" rel="noopener">Reservar ↗</a>` : refuge?.telefono ? `<span>${escapeHtml(refuge.telefono)}</span>` : ""}
          </div>
        </article>`;
      }).join("")}
    </div>
    <div class="gr11-campaign-totals">
      <div><strong>${totals.distance.toFixed(1)} km</strong><span>Distancia</span></div>
      <div><strong>${Math.round(totals.gain)} m+</strong><span>Ascenso</span></div>
      <div><strong>${Math.round(totals.loss)} m−</strong><span>Descenso</span></div>
      <div><strong>${durationText(totals.minutes)}</strong><span>Tiempo previsto</span></div>
      <div><strong>${stages.length}</strong><span>Alojamientos</span></div>
    </div>`;
  els.campaignPreview.dataset.totals = JSON.stringify(totals);
}

function bindCampaignPlanner() {
  els.newCampaign.addEventListener("click", openCampaignWizard);
  els.campaignModal.querySelectorAll("[data-campaign-close]").forEach((button) => button.addEventListener("click", closeCampaignWizard));
  els.campaignStageSearch.addEventListener("input", renderCampaignStageOptions);
  els.campaignDate.addEventListener("change", () => {
    const date = localDateFromInput(els.campaignDate.value);
    if (date && (!els.campaignName.value.trim() || /^GR11 · /.test(els.campaignName.value))) {
      els.campaignName.value = suggestedCampaignName(date);
    }
  });
  els.campaignModal.querySelectorAll("[data-days]").forEach((button) => {
    button.addEventListener("click", () => {
      els.campaignDays.value = button.dataset.days;
      validateCampaignDays();
      els.campaignModal.querySelectorAll("[data-days]").forEach((item) => item.classList.toggle("is-selected", item === button));
    });
  });
  els.campaignDays.addEventListener("input", validateCampaignDays);
  els.campaignNext.addEventListener("click", () => {
    if (validateCampaignStep()) showCampaignStep(Math.min(5, campaignStep + 1));
  });
  els.campaignBack.addEventListener("click", () => showCampaignStep(Math.max(1, campaignStep - 1)));
  els.campaignForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const stages = campaignSelection();
    const totals = JSON.parse(els.campaignPreview.dataset.totals || '{"distance":0,"gain":0,"loss":0,"minutes":0}');
    draftCampaigns.push({
      id: `TMP${String(draftCampaigns.length + 1).padStart(3, "0")}`,
      name: els.campaignName.value.trim(),
      startDate: localDateFromInput(els.campaignDate.value),
      stages,
      totals
    });
    renderCampaigns();
    closeCampaignWizard();
    document.querySelector("#campanas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.campaignModal.hidden) closeCampaignWizard();
  });
}

function bind() {
  [els.search, els.state, els.difficulty].forEach((control) => control.addEventListener("input", renderStages));
  els.mapMessage.addEventListener("click", resetMapView);
  els.mapMessage.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      resetMapView();
    }
  });
  els.reset.addEventListener("click", () => {
    els.search.value = "";
    els.state.value = "";
    els.difficulty.value = "";
    resetMapView();
    renderStages();
  });
}

async function start() {
  try {
    initMap();
    const raw = await loadGr11RawData();
    DB = buildGr11Database(raw);
    renderStats();
    populateFilters();
    renderRefuges();
    const tracksLoaded = await renderTracks();
    renderStages();
    renderCampaigns();
    bind();
    bindCampaignPlanner();

    if (!tracksLoaded) {
      els.mapMessage.querySelector("span").textContent = "No se ha podido cargar ningún GPX.";
    } else {
      els.status.textContent = `${tracksLoaded} de ${DB.etapas.length} tracks GPX cargados.`;
      els.mapMessage.querySelector("span").textContent = `${tracksLoaded} etapas dibujadas. Selecciona una para explorarla.`;
    }
  } catch (error) {
    console.error(error);
    els.status.textContent = "No se pudieron cargar los datos del GR11.";
    els.summary.textContent = "Comprueba que las hojas de Google Sheets estén publicadas o accesibles.";
    els.grid.innerHTML = `<p class="archive-empty">${escapeHtml(error.message)}</p>`;
  }
}

start();
