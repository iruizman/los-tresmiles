import {
  isAdmin,
  isAuthorized,
  observeAuth,
  signInWithGoogle,
  signOutCurrentUser
} from "./auth.js";
import { loadCampaigns, observeCampaigns, updateCampaign, normalizeCampaignStatus, campaignStatusLabel, campaignStatusClass } from "./campaign-store.js";
import { loadGr11RawData } from "./data.js";
import { buildGr11Database } from "./db.js";
import { calculateCampaign } from "./campaign-metrics.js";

const loading = document.querySelector("#basecamp-loading");
const locked = document.querySelector("#basecamp-locked");
const denied = document.querySelector("#basecamp-denied");
const content = document.querySelector("#basecamp-content");

function showOnly(target) {
  [loading, locked, denied, content].forEach((section) => {
    if (section) section.hidden = section !== target;
  });
}

function firstName(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  const rawName = String(user?.displayName || "").trim();
  const first = rawName.split(/\s+/)[0] || "";

  // La cuenta de administrador llega desde Google con la ñ dañada
  // en algunos navegadores/dispositivos. Forzamos aquí el nombre correcto.
  if (email === "iruizm@ekonomistak.eus") {
    return "Iñaki";
  }

  // Corrección defensiva por si el carácter de reemplazo aparece
  // en otros nombres recibidos desde el proveedor.
  return (first || "Iñaki").replaceAll("�", "ñ");
}

function fillUser(user) {
  document.querySelectorAll("[data-user-name]").forEach((node) => { node.textContent = firstName(user); });
  document.querySelectorAll("[data-user-email]").forEach((node) => { node.textContent = user.email || ""; });
  document.querySelectorAll("[data-user-role]").forEach((node) => {
    node.textContent = isAdmin(user) ? "Administrador" : "Usuario autorizado";
  });
}

function localDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function formatDate(value) {
  const date = localDate(value);
  return date ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(date) : "Fecha por definir";
}

function durationText(minutes) {
  const value = Number(minutes) || 0;
  if (!value) return "—";
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function campaignUrl(campaign) {
  return `base-camp-campana.html?id=${encodeURIComponent(campaign.id)}`;
}

function campaignSortValue(campaign) {
  return localDate(campaign.startDate)?.getTime() || Number.MAX_SAFE_INTEGER;
}

function futureCampaigns(campaigns) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return campaigns
    .filter((campaign) => {
      const date = localDate(campaign.startDate);
      return !["completada", "cancelada", "archivada"].includes(normalizeCampaignStatus(campaign.status)) && (!date || date >= today);
    })
    .sort((a, b) => (localDate(a.startDate)?.getTime() || Infinity) - (localDate(b.startDate)?.getTime() || Infinity));
}

function renderCampaignDashboard(campaigns) {
  const all = Array.isArray(campaigns) ? [...campaigns] : [];
  all.sort((a, b) => campaignSortValue(a) - campaignSortValue(b));
  const upcoming = futureCampaigns(all);
  const next = upcoming[0] || null;
  const dayCount = all.reduce((sum, campaign) => sum + campaign.stages.length, 0);
  const distance = all.reduce((sum, campaign) => sum + campaign.totals.distance, 0);
  const gain = all.reduce((sum, campaign) => sum + campaign.totals.gain, 0);

  document.querySelector("#basecamp-campaign-count").textContent = String(all.length);
  document.querySelector("#basecamp-day-count").textContent = String(dayCount);
  document.querySelector("#basecamp-distance").textContent = `${distance.toFixed(all.length ? 1 : 0)} km`;
  document.querySelector("#basecamp-gain").textContent = `${Math.round(gain)} m+`;

  const host = document.querySelector("#basecamp-next-campaign");
  if (host) {
    if (!next) {
      host.innerHTML = `
        <div class="basecamp-section-heading">
          <div><p class="eyebrow">Próxima expedición</p><h3>Sin campañas activas</h3></div>
          <a class="primary-button" href="gr11.html?newCampaign=1#campanas">+ Nueva campaña</a>
        </div>
        <div class="basecamp-empty-campaign">
          <div class="basecamp-route-symbol" aria-hidden="true">↗</div>
          <p>Crea una campaña del GR11 y aquí aparecerán su recorrido, jornadas y totales.</p>
        </div>`;
    } else {
      const first = next.stages[0];
      const last = next.stages.at(-1);
      host.innerHTML = `
        <div class="basecamp-section-heading">
          <div><p class="eyebrow">Próxima expedición</p><h3>${next.name}</h3></div>
          <a class="secondary-button" href="${campaignUrl(next)}">Ver campaña →</a>
        </div>
        <div class="basecamp-campaign-summary">
          <div class="basecamp-campaign-date"><span>Inicio</span><strong>${formatDate(next.startDate)}</strong></div>
          <div class="basecamp-campaign-route"><span>${first?.id || "GR11"}</span><strong>${first?.inicio || "Inicio"} → ${last?.final || "Final"}</strong><small>${next.stages.length} ${next.stages.length === 1 ? "jornada" : "jornadas"}</small></div>
          <div class="basecamp-campaign-facts">
            <div><strong>${next.totals.distance.toFixed(1)} km</strong><span>Distancia</span></div>
            <div><strong>${Math.round(next.totals.gain)} m+</strong><span>Ascenso</span></div>
            <div><strong>${durationText(next.totals.minutes)}</strong><span>Tiempo</span></div>
          </div>
        </div>`;
    }
  }

  const list = document.querySelector("#basecamp-campaign-list");
  const empty = document.querySelector("#basecamp-campaign-list-empty");
  if (!list) return;
  empty.hidden = all.length > 0;
  list.hidden = all.length === 0;
  list.innerHTML = all.map((campaign) => {
    const first = campaign.stages[0];
    const last = campaign.stages.at(-1);
    return `<a class="basecamp-campaign-list-card" href="${campaignUrl(campaign)}">
      <div class="basecamp-campaign-list-card__top"><span class="basecamp-status ${campaignStatusClass(campaign.status)}">${campaignStatusLabel(campaign.status)}</span><small>${formatDate(campaign.startDate)}</small></div>
      <h4>${campaign.name}</h4>
      <p>${first?.inicio || "Inicio"} → ${last?.final || "Final"}</p>
      <div class="basecamp-campaign-list-card__facts">
        <span><strong>${campaign.stages.length}</strong> jornadas</span>
        <span><strong>${campaign.totals.distance.toFixed(1)} km</strong></span>
        <span><strong>${Math.round(campaign.totals.gain)} m+</strong></span>
      </div>
      <span class="basecamp-campaign-list-card__action">Ver campaña →</span>
    </a>`;
  }).join("");
}
async function refreshCampaignMetrics(campaigns) {
  if (!campaigns.length) return campaigns;
  try {
    const raw = await loadGr11RawData();
    const database = buildGr11Database(raw);
    const refreshed = [];
    for (const campaign of campaigns) {
      const calculated = await calculateCampaign(campaign, database);
      const updated = updateCampaign(campaign.id, { totals: calculated.totals });
      refreshed.push(updated || campaign);
    }
    return refreshed;
  } catch (error) {
    console.warn("No se pudieron recalcular las campañas", error);
    return campaigns;
  }
}

function renderGreeting() {
  const hour = new Date().getHours();
  const greeting = hour < 13 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  document.querySelector("#basecamp-greeting").textContent = greeting;
  document.querySelector("#basecamp-daypart").textContent = hour < 13 ? "Comienza la jornada" : "Centro de operaciones";
}

document.querySelectorAll("[data-basecamp-login]").forEach((button) => {
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error?.code !== "auth/popup-closed-by-user") {
        console.error(error);
        const status = document.querySelector("#basecamp-auth-error");
        if (status) status.textContent = "No se pudo iniciar sesión. Inténtalo de nuevo.";
      }
    } finally {
      button.disabled = false;
    }
  });
});

document.querySelectorAll("[data-basecamp-signout]").forEach((button) => {
  button.addEventListener("click", () => signOutCurrentUser());
});

observeAuth((user) => {
  if (!user) {
    showOnly(locked);
    return;
  }
  fillUser(user);
  if (!isAuthorized(user)) {
    showOnly(denied);
    return;
  }
  renderGreeting();
  const campaigns = loadCampaigns();
  renderCampaignDashboard(campaigns);
  observeCampaigns(renderCampaignDashboard);
  showOnly(content);
  refreshCampaignMetrics(campaigns).then(renderCampaignDashboard);
});
