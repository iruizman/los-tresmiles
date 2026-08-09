import {
  isAuthorized,
  observeAuth,
  signInWithGoogle,
  signOutCurrentUser
} from "./auth.js";

import {
  loadCampaigns,
  updateCampaign,
  removeCampaign,
  campaignStatusLabel,
  campaignStatusClass
} from "./campaign-store.js";

import { loadGr11RawData } from "./data.js";
import { buildGr11Database } from "./db.js";
import { calculateCampaign } from "./campaign-metrics.js";
import { etapaUrl } from "./gr11-shared.js";


const ui = {
  loading: document.querySelector("#campaign-detail-loading"),
  locked: document.querySelector("#campaign-detail-locked"),
  denied: document.querySelector("#campaign-detail-denied"),
  missing: document.querySelector("#campaign-detail-missing"),
  content: document.querySelector("#campaign-detail-content"),

  heading: document.querySelector("#campaign-detail-heading"),
  eyebrow: document.querySelector("#campaign-detail-eyebrow"),
  stats: document.querySelector("#campaign-detail-stats"),
  days: document.querySelector("#campaign-day-list"),

  mapReset: document.querySelector("#campaign-map-reset"),

  editToggle: document.querySelector("#campaign-edit-toggle"),
  editor: document.querySelector("#campaign-editor"),
  editorClose: document.querySelector("#campaign-editor-close"),
  editorForm: document.querySelector("#campaign-editor-form"),

  editName: document.querySelector("#campaign-edit-name"),
  editDate: document.querySelector("#campaign-edit-date"),
  editStatus: document.querySelector("#campaign-edit-status"),
  editNotes: document.querySelector("#campaign-edit-notes"),

  stageEditorList: document.querySelector("#campaign-stage-editor-list"),
  stageAddSelect: document.querySelector("#campaign-stage-add-select"),
  stageAddButton: document.querySelector("#campaign-stage-add-button"),

  editorMessage: document.querySelector("#campaign-editor-message"),
  deleteButton: document.querySelector("#campaign-delete-button")
};


let map;
let routeLayer;
let routeBounds;

let database;
let currentCampaign;
let currentCalculated;

let editorOpen = false;


function showOnly(target) {
  [
    ui.loading,
    ui.locked,
    ui.denied,
    ui.missing,
    ui.content
  ].forEach((node) => {
    if (node) {
      node.hidden = node !== target;
    }
  });
}


function localDate(value) {
  const match = String(value || "")
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      )
    : null;
}


function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}


function formatDate(date, options = {}) {
  if (
    !(date instanceof Date) ||
    Number.isNaN(date.getTime())
  ) {
    return "Fecha por definir";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: options.short ? "short" : "long",
    year: options.year === false ? undefined : "numeric"
  }).format(date);
}


function durationText(minutes) {
  const value = Math.round(Number(minutes) || 0);

  if (!value) {
    return "—";
  }

  const hours = Math.floor(value / 60);
  const rest = value % 60;

  return rest
    ? `${hours} h ${rest} min`
    : `${hours} h`;
}


function statusLabel(value) {
  return campaignStatusLabel(value);
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function campaignStageUrl(stage, campaignId) {
  const url = new URL(
    etapaUrl(stage),
    window.location.href
  );

  url.searchParams.set(
    "campana",
    campaignId
  );

  return `${url.pathname.split("/").at(-1)}${url.search}${url.hash}`;
}


function stageSnapshot(stage) {
  return {
    id: stage.id,
    nombre: stage.nombre,
    inicio: stage.inicio,
    final: stage.final,
    tiempoEstimado: stage.tiempoEstimado,

    refugio: stage.refugio
      ? {
          id: stage.refugio.id,
          nombre: stage.refugio.nombre,
          tipo: stage.refugio.tipo,
          abierto: stage.refugio.abierto,
          telefono: stage.refugio.telefono,
          reservasUrl: stage.refugio.reservasUrl
        }
      : null
  };
}


function initMap() {
  if (map) {
    return;
  }

  map = L.map("campaign-map", {
    scrollWheelZoom: true
  });

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap"
    }
  ).addTo(map);

  routeLayer = L.featureGroup().addTo(map);
}


function renderHeading(campaign, stages) {
  const first = stages[0];
  const last = stages.at(-1);

  const start = localDate(
    campaign.startDate
  );

  const end = start
    ? addDays(
        start,
        Math.max(0, stages.length - 1)
      )
    : null;

  document.title =
    `${campaign.name} · Base Camp`;

  if (ui.eyebrow) {
    ui.eyebrow.textContent =
      campaign.status === "completada"
        ? "Expedición completada"
        : campaign.status === "en curso"
          ? "Expedición en curso"
          : campaign.status === "borrador"
            ? "Borrador de expedición"
            : "Expedición planificada";
  }

  ui.heading.innerHTML = `
    <h1>${escapeHtml(campaign.name)}</h1>

    <p class="campaign-detail-route">
      ${escapeHtml(first?.inicio || "Inicio")}
      →
      ${escapeHtml(last?.final || "Final")}
    </p>

    <div class="campaign-detail-meta">

      <span
        class="campaign-detail-status ${campaignStatusClass(campaign.status)}"
      >
        ${escapeHtml(statusLabel(campaign.status))}
      </span>

      <span>
        ${formatDate(start)}
        ${
          end && stages.length > 1
            ? ` – ${formatDate(end)}`
            : ""
        }
      </span>

      <span>
        ${stages.length}
        ${stages.length === 1 ? "jornada" : "jornadas"}
      </span>

    </div>
  `;
}


function renderStats(totals, stages) {
  const items = [
    [`${stages.length}`, "Jornadas"],
    [`${totals.distance.toFixed(1)} km`, "Distancia"],
    [`${Math.round(totals.gain)} m+`, "Ascenso"],
    [`${Math.round(totals.loss)} m−`, "Descenso"],
    [durationText(totals.minutes), "Tiempo previsto"]
  ];

  ui.stats.innerHTML = items
    .map(
      ([value, label]) => `
        <div class="campaign-detail-stat">
          <strong>${value}</strong>
          <span>${label}</span>
        </div>
      `
    )
    .join("");
}


function renderDays(campaign, stages, metrics) {
  const start = localDate(
    campaign.startDate
  );

  ui.days.innerHTML = stages
    .map((stage, index) => {
      const refuge = stage.refugio;

      return `
        <article class="campaign-day-card">

          <div class="campaign-day-card__date">
            <span>Día ${index + 1}</span>

            <strong>
              ${formatDate(
                start
                  ? addDays(start, index)
                  : null,
                { year: false }
              )}
            </strong>
          </div>

          <div class="campaign-day-card__main">

            <span class="campaign-day-card__id">
              ${escapeHtml(stage.id)}
            </span>

            <h3>
              ${escapeHtml(stage.nombre)}
            </h3>

            <p>
              ${escapeHtml(stage.inicio)}
              →
              ${escapeHtml(stage.final)}
            </p>

            <div class="campaign-day-card__facts">
              <span>
                ${metrics[index].distance.toFixed(1)} km
              </span>

              <span>
                ${Math.round(metrics[index].gain)} m+
              </span>

              <span>
                ${escapeHtml(stage.tiempoEstimado || "—")}
              </span>
            </div>

            <a
              class="campaign-day-card__link"
              href="${campaignStageUrl(stage, campaign.id)}"
            >
              Ver ficha de etapa →
            </a>

          </div>

          <div class="campaign-day-card__stay">

            <span>Alojamiento previsto</span>

            <strong>
              ${escapeHtml(
                refuge?.nombre ||
                "Sin alojamiento definido"
              )}
            </strong>

            <small>
              ${escapeHtml(refuge?.tipo || "")}
              ${
                refuge?.abierto
                  ? ` · ${escapeHtml(refuge.abierto)}`
                  : ""
              }
            </small>

            ${
              refuge?.reservasUrl
                ? `
                  <a
                    class="campaign-day-card__link"
                    href="${escapeHtml(refuge.reservasUrl)}"
                    target="_blank"
                    rel="noopener"
                  >
                    Reservar ↗
                  </a>
                `
                : ""
            }

          </div>

        </article>
      `;
    })
    .join("");
}


function renderMap(stages, metrics) {
  initMap();

  routeLayer.clearLayers();
  routeBounds = null;

  stages.forEach((stage, index) => {
    const track = metrics[index]?.track;

    if (!track) {
      return;
    }

    const segments =
      Array.isArray(track.segments) &&
      track.segments.length
        ? track.segments
        : Array.isArray(track.points) &&
            track.points.length
          ? [track.points]
          : [];

    segments.forEach((segment) => {
      const coordinates = segment
        .filter(
          (point) =>
            Number.isFinite(point?.lat) &&
            Number.isFinite(point?.lon)
        )
        .map(
          (point) => [
            point.lat,
            point.lon
          ]
        );

      if (coordinates.length < 2) {
        return;
      }

      const line = L.polyline(
        coordinates,
        {
          color: "#d98218",
          weight: 6,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round"
        }
      ).addTo(routeLayer);

      line.bindPopup(`
        <div class="campaign-map-popup">
          <strong>
            ${escapeHtml(stage.id)}
            ·
            ${escapeHtml(stage.nombre)}
          </strong>

          <span>
            ${escapeHtml(stage.inicio)}
            →
            ${escapeHtml(stage.final)}
          </span>
        </div>
      `);
    });
  });

  if (!routeLayer.getLayers().length) {
    return;
  }

  routeBounds = routeLayer.getBounds();

  const all = routeLayer.getLayers();

  const firstPoint =
    (all[0]?.getLatLngs?.() || [])[0];

  const lastLatLngs =
    all.at(-1)?.getLatLngs?.() || [];

  const lastPoint =
    lastLatLngs.at(-1);

  if (firstPoint) {
    L.circleMarker(
      firstPoint,
      {
        radius: 7,
        color: "#fff",
        weight: 3,
        fillColor: "#1f6b48",
        fillOpacity: 1
      }
    )
      .bindTooltip("Inicio")
      .addTo(routeLayer);
  }

  if (lastPoint) {
    L.circleMarker(
      lastPoint,
      {
        radius: 7,
        color: "#fff",
        weight: 3,
        fillColor: "#c4473d",
        fillOpacity: 1
      }
    )
      .bindTooltip("Final")
      .addTo(routeLayer);
  }

  const fit = () => {
    map.invalidateSize({
      pan: false
    });

    if (routeBounds?.isValid?.()) {
      map.fitBounds(
        routeBounds,
        {
          padding: [30, 30],
          maxZoom: 12
        }
      );
    }
  };

  requestAnimationFrame(
    () => requestAnimationFrame(fit)
  );

  setTimeout(fit, 180);
}


function setEditorMessage(
  message,
  type = "ok"
) {
  ui.editorMessage.textContent =
    message;

  ui.editorMessage.dataset.type =
    type;
}


function fillGeneralEditor() {
  ui.editName.value =
    currentCampaign.name;

  ui.editDate.value =
    currentCampaign.startDate;

  ui.editStatus.value =
    currentCampaign.status ||
    "planificada";

  ui.editNotes.value =
    currentCampaign.notes || "";
}


function renderStageEditor() {
  const ids = currentCampaign.stages
    .map((stage) => stage.id);

  ui.stageEditorList.innerHTML =
    currentCampaign.stages
      .map((saved, index) => {
        const stage =
          database.indexes.etapasById.get(
            saved.id
          ) || saved;

        return `
          <article class="campaign-stage-editor-row">

            <div class="campaign-stage-editor-row__number">
              ${index + 1}
            </div>

            <div>
              <strong>
                ${escapeHtml(stage.id)}
                ·
                ${escapeHtml(stage.nombre)}
              </strong>

              <span>
                ${escapeHtml(stage.inicio)}
                →
                ${escapeHtml(stage.final)}
              </span>
            </div>

            <div class="campaign-stage-editor-row__actions">

              <button
                type="button"
                data-stage-action="up"
                data-index="${index}"
                ${index === 0 ? "disabled" : ""}
                aria-label="Subir etapa"
              >
                ↑
              </button>

              <button
                type="button"
                data-stage-action="down"
                data-index="${index}"
                ${
                  index ===
                  currentCampaign.stages.length - 1
                    ? "disabled"
                    : ""
                }
                aria-label="Bajar etapa"
              >
                ↓
              </button>

              <button
                class="danger"
                type="button"
                data-stage-action="remove"
                data-index="${index}"
                ${
                  currentCampaign.stages.length <= 1
                    ? "disabled"
                    : ""
                }
              >
                Eliminar
              </button>

            </div>

          </article>
        `;
      })
      .join("");

  const available =
    database.etapas.filter(
      (stage) =>
        !ids.includes(stage.id)
    );

  ui.stageAddSelect.innerHTML =
    available.length
      ? `
        <option value="">
          Selecciona una etapa…
        </option>

        ${available
          .map(
            (stage) => `
              <option value="${escapeHtml(stage.id)}">
                ${escapeHtml(stage.id)}
                ·
                ${escapeHtml(stage.nombre)}
              </option>
            `
          )
          .join("")}
      `
      : `
        <option value="">
          Todas las etapas están añadidas
        </option>
      `;

  ui.stageAddButton.disabled =
    !available.length;
}


function toggleEditor(force) {
  editorOpen =
    typeof force === "boolean"
      ? force
      : !editorOpen;

  ui.editor.hidden =
    !editorOpen;

  ui.editToggle.textContent =
    editorOpen
      ? "Cerrar editor"
      : "Editar campaña";

  if (editorOpen) {
    fillGeneralEditor();
    renderStageEditor();

    ui.editor.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


async function persistStages(
  stages,
  message
) {
  const updated = updateCampaign(
    currentCampaign.id,
    { stages }
  );

  if (!updated) {
    throw new Error(
      "No se pudo guardar la campaña."
    );
  }

  currentCampaign = updated;

  await refreshCampaign();

  renderStageEditor();

  setEditorMessage(message);
}


async function refreshCampaign() {
  currentCalculated =
    await calculateCampaign(
      currentCampaign,
      database
    );

  if (!currentCalculated.stages.length) {
    throw new Error(
      "La campaña no contiene etapas válidas."
    );
  }

  currentCampaign =
    updateCampaign(
      currentCampaign.id,
      {
        totals:
          currentCalculated.totals
      }
    ) || currentCampaign;

  renderHeading(
    currentCampaign,
    currentCalculated.stages
  );

  renderStats(
    currentCalculated.totals,
    currentCalculated.stages
  );

  renderDays(
    currentCampaign,
    currentCalculated.stages,
    currentCalculated.metrics
  );

  renderMap(
    currentCalculated.stages,
    currentCalculated.metrics
  );
}


async function loadCampaignDetail() {
  const id =
    new URLSearchParams(
      window.location.search
    ).get("id");

  currentCampaign =
    loadCampaigns().find(
      (item) => item.id === id
    );

  if (!currentCampaign) {
    showOnly(ui.missing);
    return;
  }

  const raw =
    await loadGr11RawData();

  database =
    buildGr11Database(raw);

  showOnly(ui.content);

  ui.editToggle.hidden = false;

  await new Promise(
    (resolve) =>
      requestAnimationFrame(
        () =>
          requestAnimationFrame(resolve)
      )
  );

  await refreshCampaign();
}


// ======================================================
// AUTENTICACIÓN
// ======================================================

document
  .querySelectorAll("[data-basecamp-login]")
  .forEach((button) =>
    button.addEventListener(
      "click",
      () => signInWithGoogle()
    )
  );


document
  .querySelectorAll("[data-basecamp-signout]")
  .forEach((button) =>
    button.addEventListener(
      "click",
      () => signOutCurrentUser()
    )
  );


// ======================================================
// MAPA
// ======================================================

ui.mapReset.addEventListener(
  "click",
  () => {
    if (routeBounds) {
      map.fitBounds(
        routeBounds,
        {
          padding: [28, 28]
        }
      );
    }
  }
);


// ======================================================
// EDITOR
// ======================================================

ui.editToggle.addEventListener(
  "click",
  () => toggleEditor()
);


ui.editorClose.addEventListener(
  "click",
  () => toggleEditor(false)
);


ui.editorForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const name =
      ui.editName.value.trim();

    if (!name) {
      setEditorMessage(
        "Escribe un nombre para la campaña.",
        "error"
      );

      return;
    }

    const updated =
      updateCampaign(
        currentCampaign.id,
        {
          name,
          startDate:
            ui.editDate.value,
          status:
            ui.editStatus.value,
          notes:
            ui.editNotes.value.trim()
        }
      );

    if (!updated) {
      setEditorMessage(
        "No se pudieron guardar los cambios.",
        "error"
      );

      return;
    }

    currentCampaign = updated;

    await refreshCampaign();

    setEditorMessage(
      "Información general actualizada."
    );
  }
);


// ======================================================
// ETAPAS
// ======================================================

ui.stageEditorList.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "button[data-stage-action]"
      );

    if (
      !button ||
      button.disabled
    ) {
      return;
    }

    const index =
      Number(button.dataset.index);

    const action =
      button.dataset.stageAction;

    const stages =
      [...currentCampaign.stages];

    if (
      action === "up" &&
      index > 0
    ) {
      [
        stages[index - 1],
        stages[index]
      ] = [
        stages[index],
        stages[index - 1]
      ];
    }

    if (
      action === "down" &&
      index < stages.length - 1
    ) {
      [
        stages[index + 1],
        stages[index]
      ] = [
        stages[index],
        stages[index + 1]
      ];
    }

    if (
      action === "remove" &&
      stages.length > 1
    ) {
      stages.splice(index, 1);
    }

    try {
      await persistStages(
        stages,
        action === "remove"
          ? "Etapa eliminada."
          : "Orden de etapas actualizado."
      );
    } catch (error) {
      console.error(error);

      setEditorMessage(
        error.message,
        "error"
      );
    }
  }
);


ui.stageAddButton.addEventListener(
  "click",
  async () => {
    const stage =
      database.indexes.etapasById.get(
        ui.stageAddSelect.value
      );

    if (!stage) {
      setEditorMessage(
        "Selecciona una etapa para añadir.",
        "error"
      );

      return;
    }

    try {
      await persistStages(
        [
          ...currentCampaign.stages,
          stageSnapshot(stage)
        ],
        `${stage.id} añadida a la campaña.`
      );
    } catch (error) {
      console.error(error);

      setEditorMessage(
        error.message,
        "error"
      );
    }
  }
);


// ======================================================
// ELIMINAR CAMPAÑA
// ======================================================

ui.deleteButton?.addEventListener(
  "click",
  async () => {
    if (!currentCampaign) {
      return;
    }

    const confirmed =
      window.confirm(
        `¿Eliminar definitivamente la campaña "${currentCampaign.name}"?\n\n` +
        "La campaña se eliminará de Base Camp. Esta acción no se puede deshacer."
      );

    if (!confirmed) {
      return;
    }

    const campaignName =
      currentCampaign.name;

    ui.deleteButton.disabled = true;
    ui.deleteButton.textContent =
      "Eliminando…";

    try {
      // No abandonamos la página hasta que Firestore
      // haya confirmado la eliminación.
      await removeCampaign(
        currentCampaign.id
      );

      window.location.href =
        `base-camp.html?deletedCampaign=${encodeURIComponent(campaignName)}`;
    } catch (error) {
      console.error(error);

      setEditorMessage(
        error.message ||
        "No se pudo eliminar la campaña.",
        "error"
      );

      ui.deleteButton.disabled = false;
      ui.deleteButton.textContent =
        "Eliminar campaña";
    }
  }
);


// ======================================================
// INICIO
// ======================================================

observeAuth((user) => {
  if (!user) {
    showOnly(ui.locked);
    return;
  }

  if (!isAuthorized(user)) {
    showOnly(ui.denied);
    return;
  }

  loadCampaignDetail()
    .catch((error) => {
      console.error(error);
      showOnly(ui.missing);
    });
});