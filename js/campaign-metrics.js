import { GPXEngine } from "./gpx-engine.js";
import { gpxUrl } from "./gr11-shared.js";

export function parseDurationMinutes(text) {
  const value = String(text || "").toLowerCase();
  const hours = Number(value.match(/(\d+(?:[.,]\d+)?)\s*h/)?.[1]?.replace(",", ".") || 0);
  const minutes = Number(value.match(/(\d+)\s*min/)?.[1] || 0);
  return Math.round(hours * 60 + minutes);
}

export async function stageMetrics(stage) {
  try {
    const track = await GPXEngine.load(gpxUrl(stage.trackReferencia));
    return {
      distance: track.distanceKm,
      gain: Number.isFinite(track.elevationGain) ? track.elevationGain : 0,
      loss: Number.isFinite(track.elevationLoss) ? track.elevationLoss : 0,
      track
    };
  } catch (error) {
    console.warn(`No se pudieron calcular las métricas de ${stage.id}`, error);
    return {
      distance: Number(stage.distanciaKm) || 0,
      gain: Number(stage.desnivelPos) || 0,
      loss: Number(stage.desnivelNeg) || 0,
      track: null
    };
  }
}

export async function calculateCampaign(campaign, database) {
  const stages = campaign.stages
    .map((saved) => database.indexes.etapasById.get(saved.id))
    .filter(Boolean);
  const metrics = await Promise.all(stages.map(stageMetrics));
  const totals = stages.reduce((acc, stage, index) => {
    acc.distance += metrics[index].distance;
    acc.gain += metrics[index].gain;
    acc.loss += metrics[index].loss;
    acc.minutes += parseDurationMinutes(stage.tiempoEstimado);
    return acc;
  }, { distance: 0, gain: 0, loss: 0, minutes: 0 });
  return { stages, metrics, totals };
}
