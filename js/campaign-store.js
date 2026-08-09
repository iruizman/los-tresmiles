import { auth, authReady } from "./firebase-config.js";

import {
  loadCloudCampaigns,
  saveCloudCampaign,
  removeCloudCampaign
} from "./firestore.js";

const STORAGE_KEY = "los-tresmiles:gr11-campaigns:v1";
const CHANGE_EVENT = "los-tresmiles:campaigns-changed";

let cloudSyncStarted = false;
let cloudSyncRunning = false;


// ======================================================
// ESTADOS
// ======================================================

export function normalizeCampaignStatus(value) {
  const normalized = String(value || "planificada")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ");

  if (
    [
      "completada",
      "completado",
      "finalizada",
      "finalizado",
      "realizada",
      "realizado"
    ].includes(normalized)
  ) {
    return "completada";
  }

  if (["en curso", "encurso"].includes(normalized)) {
    return "en curso";
  }

  if (["cancelada", "cancelado"].includes(normalized)) {
    return "cancelada";
  }

  if (["archivada", "archivado"].includes(normalized)) {
    return "archivada";
  }

  if (normalized === "borrador") {
    return "borrador";
  }

  return "planificada";
}


export function campaignStatusLabel(value) {
  return {
    borrador: "Borrador",
    planificada: "Planificada",
    "en curso": "En curso",
    completada: "Completada",
    cancelada: "Cancelada",
    archivada: "Archivada"
  }[normalizeCampaignStatus(value)];
}


export function campaignStatusClass(value) {
  return normalizeCampaignStatus(value).replaceAll(" ", "-");
}


export function campaignStageStatusMap(campaigns = loadCampaigns()) {
  const result = new Map();

  (Array.isArray(campaigns) ? campaigns : []).forEach((campaign) => {
    const status = normalizeCampaignStatus(campaign.status);

    if (["cancelada", "archivada"].includes(status)) {
      return;
    }

    const stageStatus =
      status === "completada"
        ? "realizada"
        : "planificada";

    (campaign.stages || []).forEach((stage) => {
      const id = String(stage?.id || "").toUpperCase();

      if (!id) {
        return;
      }

      if (stageStatus === "realizada" || !result.has(id)) {
        result.set(id, stageStatus);
      }
    });
  });

  return result;
}


// ======================================================
// NORMALIZACIÓN
// ======================================================

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}


function cleanCampaign(campaign) {
  if (!campaign || typeof campaign !== "object") {
    return null;
  }

  const stages = Array.isArray(campaign.stages)
    ? campaign.stages
    : [];

  return {
    id: String(campaign.id || ""),
    name: String(campaign.name || "Campaña GR11"),
    status: normalizeCampaignStatus(campaign.status),
    startDate: String(campaign.startDate || ""),
    notes: String(campaign.notes || ""),
    createdAt: String(campaign.createdAt || ""),
    updatedAt: String(campaign.updatedAt || ""),

    stages: stages
      .map((stage) => ({
        id: String(stage?.id || ""),
        nombre: String(stage?.nombre || ""),
        inicio: String(stage?.inicio || ""),
        final: String(stage?.final || ""),
        tiempoEstimado: String(stage?.tiempoEstimado || ""),

        refugio: stage?.refugio
          ? {
              id: String(stage.refugio.id || ""),
              nombre: String(stage.refugio.nombre || ""),
              tipo: String(stage.refugio.tipo || ""),
              abierto: String(stage.refugio.abierto || ""),
              telefono: String(stage.refugio.telefono || ""),
              reservasUrl: String(stage.refugio.reservasUrl || "")
            }
          : null
      }))
      .filter((stage) => stage.id),

    totals: {
      distance: Number(campaign.totals?.distance) || 0,
      gain: Number(campaign.totals?.gain) || 0,
      loss: Number(campaign.totals?.loss) || 0,
      minutes: Number(campaign.totals?.minutes) || 0
    }
  };
}


// ======================================================
// LOCAL STORAGE
// ======================================================

export function loadCampaigns() {
  const raw = safeParse(
    localStorage.getItem(STORAGE_KEY),
    []
  );

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(cleanCampaign)
    .filter(Boolean);
}


function saveLocalCampaigns(campaigns) {
  const clean = (Array.isArray(campaigns) ? campaigns : [])
    .map(cleanCampaign)
    .filter(Boolean);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(clean)
  );

  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, {
      detail: clean
    })
  );

  return clean;
}


// ======================================================
// FIRESTORE
// ======================================================

function campaignTimestamp(campaign) {
  const value =
    campaign?.updatedAt ||
    campaign?.createdAt ||
    "";

  const time = Date.parse(value);

  return Number.isFinite(time)
    ? time
    : 0;
}


async function pushChangesToCloud(
  previousCampaigns,
  nextCampaigns
) {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  const previousIds = new Set(
    previousCampaigns.map((campaign) => campaign.id)
  );

  const nextIds = new Set(
    nextCampaigns.map((campaign) => campaign.id)
  );

  // Crear o actualizar campañas.
  for (const campaign of nextCampaigns) {
    try {
      await saveCloudCampaign(
        user.uid,
        campaign
      );
    } catch (error) {
      console.error(
        `No se pudo guardar ${campaign.id} en Firestore:`,
        error
      );
    }
  }

  // Eliminar de Firestore las campañas que
  // hayan sido borradas localmente.
  for (const id of previousIds) {
    if (!nextIds.has(id)) {
      try {
        await removeCloudCampaign(
          user.uid,
          id
        );
      } catch (error) {
        console.error(
          `No se pudo eliminar ${id} de Firestore:`,
          error
        );
      }
    }
  }
}


export async function syncCampaignsWithCloud() {
  if (cloudSyncRunning) {
    return loadCampaigns();
  }

  const user = auth.currentUser;

  if (!user) {
    return loadCampaigns();
  }

  cloudSyncRunning = true;

  try {
    const localCampaigns = loadCampaigns();

    const cloudCampaigns = (
      await loadCloudCampaigns(user.uid)
    )
      .map(cleanCampaign)
      .filter(Boolean);

    // Primera migración:
    // Firestore está vacío y existen campañas locales.
    if (
      cloudCampaigns.length === 0 &&
      localCampaigns.length > 0
    ) {
      for (const campaign of localCampaigns) {
        await saveCloudCampaign(
          user.uid,
          campaign
        );
      }

      console.info(
        `Base Camp: ${localCampaigns.length} campaña(s) migrada(s) a Firestore.`
      );

      return localCampaigns;
    }

    // Unimos nube + local sin perder cambios.
    const merged = new Map();

    cloudCampaigns.forEach((campaign) => {
      merged.set(
        campaign.id,
        campaign
      );
    });

    for (const localCampaign of localCampaigns) {
      const cloudCampaign = merged.get(
        localCampaign.id
      );

      // Campaña que solo existe localmente.
      if (!cloudCampaign) {
        merged.set(
          localCampaign.id,
          localCampaign
        );

        await saveCloudCampaign(
          user.uid,
          localCampaign
        );

        continue;
      }

      // Si la versión local es más reciente,
      // la enviamos a Firestore.
      if (
        campaignTimestamp(localCampaign) >
        campaignTimestamp(cloudCampaign)
      ) {
        merged.set(
          localCampaign.id,
          localCampaign
        );

        await saveCloudCampaign(
          user.uid,
          localCampaign
        );
      }
    }

    const result = Array.from(
      merged.values()
    );

    saveLocalCampaigns(result);

    console.info(
      `Base Camp sincronizado: ${result.length} campaña(s).`
    );

    return result;
  } catch (error) {
    console.error(
      "No se pudieron sincronizar las campañas con Firestore:",
      error
    );

    // Si Firestore falla, Base Camp sigue funcionando
    // con la copia local.
    return loadCampaigns();
  } finally {
    cloudSyncRunning = false;
  }
}


// ======================================================
// GUARDADO PÚBLICO
// ======================================================

export function saveCampaigns(campaigns) {
  const previous = loadCampaigns();

  const clean = saveLocalCampaigns(
    campaigns
  );

  // Firestore se actualiza en segundo plano.
  // No bloqueamos la interfaz.
  pushChangesToCloud(
    previous,
    clean
  );

  return clean;
}


// ======================================================
// IDENTIFICADORES
// ======================================================

export function nextCampaignId(
  campaigns = loadCampaigns()
) {
  const used = campaigns
    .map((campaign) =>
      Number(
        String(campaign.id)
          .replace(/\D/g, "")
      )
    )
    .filter(Number.isFinite);

  const next =
    (used.length
      ? Math.max(...used)
      : 0) + 1;

  return `TMP${String(next).padStart(3, "0")}`;
}


// ======================================================
// CRUD
// ======================================================

export function addCampaign(campaign) {
  const campaigns = loadCampaigns();
  const now = new Date().toISOString();

  const clean = cleanCampaign({
    ...campaign,

    id:
      campaign?.id ||
      nextCampaignId(campaigns),

    createdAt:
      campaign?.createdAt ||
      now,

    updatedAt: now
  });

  if (!clean) {
    throw new Error(
      "La campaña no es válida."
    );
  }

  campaigns.push(clean);

  saveCampaigns(campaigns);

  return clean;
}


export function updateCampaign(id, patch) {
  const campaigns = loadCampaigns();

  const index = campaigns.findIndex(
    (campaign) =>
      campaign.id === id
  );

  if (index < 0) {
    return null;
  }

  const next = cleanCampaign({
    ...campaigns[index],
    ...patch,

    id: campaigns[index].id,

    updatedAt:
      new Date().toISOString()
  });

  if (!next) {
    return null;
  }

  campaigns[index] = next;

  saveCampaigns(campaigns);

  return next;
}


export async function removeCampaign(id) {
  const previousCampaigns = loadCampaigns();

  const campaignToDelete = previousCampaigns.find(
    (campaign) => campaign.id === id
  );

  if (!campaignToDelete) {
    return previousCampaigns;
  }

  const nextCampaigns = previousCampaigns.filter(
    (campaign) => campaign.id !== id
  );

  // Primero actualizamos la copia local.
  saveLocalCampaigns(nextCampaigns);

  const user = auth.currentUser;

  if (user) {
    try {
      // Esperamos expresamente a que Firestore confirme el borrado.
      await removeCloudCampaign(
        user.uid,
        id
      );
    } catch (error) {
      console.error(
        `No se pudo eliminar ${id} de Firestore:`,
        error
      );

      // Si falla la nube, restauramos la copia local para
      // no crear una falsa sensación de que se ha eliminado.
      saveLocalCampaigns(previousCampaigns);

      throw new Error(
        "No se pudo eliminar la campaña de Base Camp. Inténtalo de nuevo."
      );
    }
  }

  return nextCampaigns;
}


// ======================================================
// OBSERVADOR
// ======================================================

export function observeCampaigns(callback) {
  const handler = (event) => {
    callback(
      event?.detail ||
      loadCampaigns()
    );
  };

  window.addEventListener(
    CHANGE_EVENT,
    handler
  );

  window.addEventListener(
    "storage",
    handler
  );

  return () => {
    window.removeEventListener(
      CHANGE_EVENT,
      handler
    );

    window.removeEventListener(
      "storage",
      handler
    );
  };
}


// ======================================================
// SINCRONIZACIÓN AUTOMÁTICA
// ======================================================

async function startCloudSync() {
  if (cloudSyncStarted) {
    return;
  }

  cloudSyncStarted = true;

  try {
    await authReady;

    if (auth.currentUser) {
      await syncCampaignsWithCloud();
    }
  } catch (error) {
    console.error(
      "No se pudo iniciar la sincronización de Base Camp:",
      error
    );
  }
}

startCloudSync();