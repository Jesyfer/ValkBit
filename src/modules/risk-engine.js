/**
 * risk-engine.js
 * Motor de riesgo centralizado (Historia 3 de requirements.md).
 *
 * Lee las constantes de deterioro directamente de data/reference-curves.json
 * y expone una única función de cálculo que acepta:
 *   - minutos activos promedio (promedio móvil de 3-7 días, o estimación de onboarding)
 *   - horas sentado por día (del cuestionario)
 *
 * El módulo NO duplica números — todos los valores de tasa salen del JSON.
 *
 * NOTA: el JSON se carga con fetch() + top-level await en vez de
 * "import ... assert { type: 'json' }" porque esa sintaxis cambió de
 * "assert" a "with" entre versiones de Chrome y falla en móviles con
 * versiones distintas — fetch() es compatible con todos los navegadores.
 */

import { getRecentRecords } from './activity-manager.js';
import { loadOnboarding } from './onboarding.js';

const referenceCurves = await fetch(
  new URL('../../data/reference-curves.json', import.meta.url)
).then(r => r.json());

// ─── Constantes derivadas del JSON ───────────────────────────────────────────

/** Tasa de pérdida de fuerza muscular (%/día sin contramedida) */
const STRENGTH_LOSS_RATE = Math.abs(
  referenceCurves.muscleStrength.dailyLossRate_noCountermeasure
);

/** Tasa de pérdida de VO₂peak (%/día, derivada de -29% en 60 días) */
const VO2_LOSS_RATE = Math.abs(
  referenceCurves.aerobicCapacity.vo2peak_60days_noCountermeasure
) / 60;

/** Umbral mínimo de actividad diaria (min) — OMS: 30 min/día */
const MIN_ACTIVE_MINUTES_PER_DAY = 30;

/** Horas sentado que equivalen al 100% de penalización por sedentarismo */
const MAX_SEDENTARY_HOURS = 14;

/** Pesos relativos del score combinado */
const WEIGHT_ACTIVITY = 0.6;
const WEIGHT_SEDENTARY = 0.4;

/** Días mínimos de historial real para dejar de usar la estimación del onboarding */
const MIN_DAYS_FOR_REAL_DATA = 3;

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Calcula el score de riesgo a partir de minutos activos diarios y horas sentado.
 *
 * @param {{ activeMinutesPerDay: number, hoursSeated: number }} params
 * @returns {{
 *   score: number,
 *   level: 'low'|'medium'|'high',
 *   label: string,
 *   color: string,
 *   activeMinutesPerDay: number,
 *   deficitMinutes: number,
 *   projectedStrengthLoss30d: number,
 *   projectedVO2Loss30d: number,
 * }}
 */
export function calculateRiskScore({ activeMinutesPerDay, hoursSeated }) {
  // Componente actividad (0 = sin actividad → máximo riesgo, 1 = umbral cubierto)
  const activityScore = Math.min(activeMinutesPerDay / MIN_ACTIVE_MINUTES_PER_DAY, 1);

  // Componente sedentarismo (0 = poco sentado, 1 = máximo)
  const sedentaryPenalty = Math.min(hoursSeated / MAX_SEDENTARY_HOURS, 1);

  // Score crudo combinado (0 = sin riesgo, 1 = riesgo máximo)
  const rawRisk = (1 - activityScore) * WEIGHT_ACTIVITY + sedentaryPenalty * WEIGHT_SEDENTARY;
  const score = Math.round(rawRisk * 100);

  // Clasificación
  const level = score <= 33 ? 'low' : score <= 66 ? 'medium' : 'high';
  const labelMap = { low: 'Riesgo bajo', medium: 'Riesgo moderado', high: 'Riesgo alto' };
  const colorMap = {
    low: 'var(--color-success)',
    medium: 'var(--color-warn)',
    high: 'var(--color-danger)',
  };

  // Proyecciones a 30 días usando tasas del JSON
  const riskFactor = rawRisk;
  const projectedStrengthLoss30d = +(riskFactor * STRENGTH_LOSS_RATE * 30).toFixed(1);
  const projectedVO2Loss30d = +(riskFactor * VO2_LOSS_RATE * 30).toFixed(1);

  return {
    score,
    level,
    label: labelMap[level],
    color: colorMap[level],
    activeMinutesPerDay: Math.round(activeMinutesPerDay),
    deficitMinutes: Math.max(0, MIN_ACTIVE_MINUTES_PER_DAY - Math.round(activeMinutesPerDay)),
    projectedStrengthLoss30d,
    projectedVO2Loss30d,
  };
}

/**
 * Calcula el score usando el promedio móvil de actividad real (3-7 días).
 * Si no hay suficientes días acumulados, cae de vuelta a la estimación del onboarding.
 *
 * @param {{ hoursSeated: number }} opts - Las horas sentado del perfil del usuario.
 * @returns {{ result: ReturnType<typeof calculateRiskScore>, source: 'realData'|'onboarding' }}
 */
export function calculateCurrentRisk({ hoursSeated }) {
  const records = getRecentRecords(7);

  // Filtrar registros que tengan datos reales (no provisionales del onboarding)
  const realRecords = records.filter(r => !r.isProvisional);

  if (realRecords.length >= MIN_DAYS_FOR_REAL_DATA) {
    // Promedio móvil de los días reales disponibles
    const avgMinutes = realRecords.reduce((sum, r) => sum + r.activeMinutes, 0) / realRecords.length;
    return {
      result: calculateRiskScore({ activeMinutesPerDay: avgMinutes, hoursSeated }),
      source: 'realData',
    };
  }

  // Fallback: usar estimación del onboarding si existe
  const onboarding = loadOnboarding();
  if (onboarding?.scoreResult) {
    const activeMinutesPerDay = onboarding.scoreResult.activeMinutesPerDay;
    return {
      result: calculateRiskScore({ activeMinutesPerDay, hoursSeated }),
      source: 'onboarding',
    };
  }

  // Sin datos de ningún tipo: riesgo máximo por defecto (sin datos = no se mueve)
  return {
    result: calculateRiskScore({ activeMinutesPerDay: 0, hoursSeated }),
    source: 'onboarding',
  };
}

/**
 * Genera proyecciones de deterioro a 30, 60 y 90 días dado un nivel de actividad.
 *
 * @param {{ activeMinutesPerDay: number, hoursSeated: number }} params
 * @returns {{ days: number, strengthLoss: number, vo2Loss: number }[]}
 */
export function projectDeterioration({ activeMinutesPerDay, hoursSeated }) {
  const activityScore = Math.min(activeMinutesPerDay / MIN_ACTIVE_MINUTES_PER_DAY, 1);
  const sedentaryPenalty = Math.min(hoursSeated / MAX_SEDENTARY_HOURS, 1);
  const rawRisk = (1 - activityScore) * WEIGHT_ACTIVITY + sedentaryPenalty * WEIGHT_SEDENTARY;

  return [30, 60, 90].map(days => ({
    days,
    strengthLoss: +(rawRisk * STRENGTH_LOSS_RATE * days).toFixed(1),
    vo2Loss: +(rawRisk * VO2_LOSS_RATE * days).toFixed(1),
  }));
}

/**
 * Expone las constantes de referencia por si la UI necesita mostrarlas.
 */
export function getReferenceData() {
  return referenceCurves;
}
