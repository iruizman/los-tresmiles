import { loadRawData } from "./data.js";
import { buildDatabase } from "./db.js";
import { escapeHtml, normalizeSearch, formatDate, summitUrl, isPrimary } from "./shared.js";

let DB;

const els = {
  summary: document.querySelector("#archive-summary"),
  search: document.querySelector("#summit-search"),
  massif: document.querySelector("#summit-massif"),
  status: document.querySelector("#summit-status"),
  order: document.querySelector("#summit-order"),
  reset: document.querySelector("#summit-reset"),
  count: document.querySelector("#summit-count"),
  grid: document.querySelector("#summit-grid"),
  gridView: document.querySelector("#grid-view"),
  listView: document.querySelector("#list-view")
};

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function firstAscent(summit) {
  return [...summit.ascensiones]
    .filter((ascent) => ascent.fechaDate instanceof Date && !Number.isNaN(ascent.fechaDate))
    .sort((a, b) => a.fechaDate - b.fechaDate)[0] || null;
}

function filteredSummits() {
  const query = normalizeSearch(els.search.value);
  const massif = els.massif.value;
  const status = els.status.value;

  const result = DB.cumbres.filter((summit) => {
    const haystack = normalizeSearch([
      summit.nombre,
      summit.nombreAlternativo,
      summit.macizo,
      summit.zonaUIAA,
      summit.pais,
      summit.tipo
    ].join(" "));

    if (query && !haystack.includes(query)) return false;
    if (massif && summit.macizo !== massif) return false;
    if (status === "ascendida" && !summit.ascendida) return false;
    if (status === "pendiente" && summit.ascendida) return false;
    return true;
  });

  const order = els.order.value;
  result.sort((a, b) => {
    if (order === "altitude-desc") return (b.altitud || 0) - (a.altitud || 0);
    if (order === "altitude-asc") return (a.altitud || 0) - (b.altitud || 0);
    if (order === "date") {
      const da = firstAscent(a)?.fechaDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const db = firstAscent(b)?.fechaDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    }
    return a.nombre.localeCompare(b.nombre, "es");
  });

  return result;
}

function cardHtml(summit) {
  const ascent = firstAscent(summit);
  const statusText = summit.ascendida ? "Ascendida" : "Sin ascensión";
  const detail = ascent
    ? `${formatDate(ascent.fecha)}${ascent.viaje?.nombre ? ` · ${ascent.viaje.nombre}` : ""}`
    : summit.zonaUIAA || summit.macizo || "";

  return `
    <a class="summit-card" href="${summitUrl(summit)}">
      <div class="summit-card-top">
        <span class="summit-status ${summit.ascendida ? "done" : "pending"}">${statusText}</span>
        <span class="summit-type">${escapeHtml(isPrimary(summit) ? "Principal" : summit.tipo || "Tresmil")}</span>
      </div>
      <div class="summit-card-mountain" aria-hidden="true">
        <svg viewBox="0 0 160 84">
          <path d="M3 78 48 18l23 32 19-25 67 53H3Z"/>
          <path d="m36 34 12-16 15 21m18 2 9-16 19 21"/>
        </svg>
      </div>
      <h2>${escapeHtml(summit.nombre)}</h2>
      ${summit.nombreAlternativo ? `<p class="summit-alt">${escapeHtml(summit.nombreAlternativo)}</p>` : ""}
      <div class="summit-meta">
        <strong>${summit.altitud ? `${summit.altitud}<small> m</small>` : "—"}</strong>
        <span>${escapeHtml(summit.macizo || summit.zonaUIAA || "")}</span>
        <span>${escapeHtml(summit.pais || "")}</span>
      </div>
      <p class="summit-detail">${escapeHtml(detail)}</p>
      <span class="summit-open">Abrir ficha →</span>
    </a>
  `;
}

function render() {
  const summits = filteredSummits();
  els.count.textContent = `${summits.length} cumbre${summits.length === 1 ? "" : "s"}`;
  els.grid.innerHTML = summits.length
    ? summits.map(cardHtml).join("")
    : `<div class="archive-empty"><strong>No hay resultados</strong><p>Prueba con otros filtros.</p></div>`;
}

function setView(mode) {
  const list = mode === "list";
  els.grid.classList.toggle("list-view", list);
  els.gridView.classList.toggle("active", !list);
  els.listView.classList.toggle("active", list);
  localStorage.setItem("summitView", mode);
}

async function start() {
  try {
    DB = buildDatabase(await loadRawData());
    const ascended = DB.cumbres.filter((summit) => summit.ascendida).length;
    els.summary.textContent = `${DB.cumbres.length} tresmiles documentados · ${ascended} con ascensión registrada.`;

    els.massif.innerHTML = `<option value="">Todos los macizos</option>` +
      uniqueSorted(DB.cumbres.map((summit) => summit.macizo))
        .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
        .join("");

    [els.search, els.massif, els.status, els.order].forEach((element) => {
      element.addEventListener(element === els.search ? "input" : "change", render);
    });

    els.reset.addEventListener("click", () => {
      els.search.value = "";
      els.massif.value = "";
      els.status.value = "";
      els.order.value = "name";
      render();
    });

    els.gridView.addEventListener("click", () => setView("grid"));
    els.listView.addEventListener("click", () => setView("list"));

    setView(localStorage.getItem("summitView") || "grid");
    render();
  } catch (error) {
    console.error(error);
    els.summary.textContent = `No se pudieron cargar los datos: ${error.message}`;
  }
}

start();
