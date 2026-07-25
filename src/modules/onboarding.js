/**
 * onboarding.js
 * Cuestionario de cold-start (Historia 1) y cálculo de score provisional.
 *
 * PROPÓSITO:
 *   Generar una estimación de riesgo el día 1, antes de que existan datos
 *   reales de sensores. El score se guarda en localStorage como base
 *   provisional y se reemplaza progresivamente con datos reales (Historia 2).
 *
 * PREGUNTAS:
 *   1. hoursSeated    — horas promedio sentado por día (0-16)
 *   2. exerciseDays   — días por semana con ejercicio (0-7)
 *   3. exerciseMinutes — minutos promedio por sesión (0-180)
 *
 * MODELO DE RIESGO PROVISIONAL:
 *   Se basa en los datos reales de las curvas NASA HRP:
 *   - Umbral mínimo de actividad de referencia: 75 min/día activos
 *     (protocolo ISS: 2.5h × 6 días/semana ÷ 7 ≈ 129 min/día como extremo
 *      superior; 30 min/día como umbral mínimo de salud general OMS).
 *   - Déficit de actividad = qué tan lejos está el usuario del mínimo.
 *   - Score 0-100 donde 0 = sin riesgo, 100 = riesgo máximo.
 *   - Clasificación: bajo (0-33), medio (34-66), alto (67-100).
 *
 * FÓRMULA:
 *   activeMinutesPerDay = (exerciseDays × exerciseMinutes) / 7
 *   sedentaryPenalty    = clamp(hoursSeated / 14, 0, 1)   // 14h sentado = máx penalización
 *   activityScore       = clamp(activeMinutesPerDay / 30, 0, 1)  // 30 min/día = sin déficit
 *   rawRisk             = (1 - activityScore) × 0.6 + sedentaryPenalty × 0.4
 *   score               = round(rawRisk × 100)
 *
 * REFERENCIAS:
 *   - Umbral 30 min/día: OMS Guidelines on Physical Activity 2020
 *   - Curvas de deterioro: reference-curves.json (NASA HRP, Kramer 2017)
 */

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Minutos activos diarios considerados como umbral mínimo de salud. */
const MIN_ACTIVE_MINUTES_PER_DAY = 30;

/** Horas sentado que equivalen al 100% de penalización por sedentarismo. */
const MAX_SEDENTARY_HOURS = 14;

/** Pesos relativos de cada componente en el score final. */
const WEIGHT_ACTIVITY   = 0.6;
const WEIGHT_SEDENTARY  = 0.4;

/** Clave de localStorage para la estimación provisional. */
const STORAGE_KEY = 'valkbit_onboarding';

// ─── Validación de respuestas ─────────────────────────────────────────────────

/**
 * Valida las respuestas del cuestionario.
 * @param {{ hoursSeated: number, exerciseDays: number, exerciseMinutes: number }} answers
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateAnswers(answers) {
  const errors = [];

  const { hoursSeated, exerciseDays, exerciseMinutes } = answers;

  if (!Number.isFinite(hoursSeated) || hoursSeated < 0 || hoursSeated > 16) {
    errors.push('Las horas sentado deben estar entre 0 y 16.');
  }
  if (!Number.isFinite(exerciseDays) || exerciseDays < 0 || exerciseDays > 7) {
    errors.push('Los días de ejercicio deben estar entre 0 y 7.');
  }
  if (!Number.isFinite(exerciseMinutes) || exerciseMinutes < 0 || exerciseMinutes > 180) {
    errors.push('Los minutos de ejercicio deben estar entre 0 y 180.');
  }

  return { ok: errors.length === 0, errors };
}

// ─── Cálculo del score ────────────────────────────────────────────────────────

/**
 * Calcula el score de riesgo provisional a partir de las respuestas.
 *
 * @param {{ hoursSeated: number, exerciseDays: number, exerciseMinutes: number }} answers
 * @returns {{
 *   score: number,            // 0-100
 *   level: 'low'|'medium'|'high',
 *   label: string,            // texto en español
 *   color: string,            // token CSS
 *   activeMinutesPerDay: number,
 *   deficitMinutes: number,   // cuánto le falta respecto al mínimo
 *   projectedStrengthLoss30d: number,  // % pérdida fuerza estimada a 30 días
 *   projectedVO2Loss30d: number,       // % pérdida VO2peak estimada a 30 días
 * }}
 */
export function calculateProvisionalScore(answers) {
  const { hoursSeated, exerciseDays, exerciseMinutes } = answers;

  // Minutos activos diarios estimados
  const activeMinutesPerDay = (exerciseDays * exerciseMinutes) / 7;

  // Componente actividad (0 = sin actividad → máximo riesgo, 1 = umbral mínimo cubierto)
  const activityScore = Math.min(activeMinutesPerDay / MIN_ACTIVE_MINUTES_PER_DAY, 1);

  // Componente sedentarismo (0 = poco tiempo sentado, 1 = máximo tiempo sentado)
  const sedentaryPenalty = Math.min(hoursSeated / MAX_SEDENTARY_HOURS, 1);

  // Score crudo combinado (0 = sin riesgo, 1 = riesgo máximo)
  const rawRisk = (1 - activityScore) * WEIGHT_ACTIVITY + sedentaryPenalty * WEIGHT_SEDENTARY;
  const score   = Math.round(rawRisk * 100);

  // Clasificación
  const level = score <= 33 ? 'low' : score <= 66 ? 'medium' : 'high';
  const labelMap = { low: 'Riesgo bajo', medium: 'Riesgo moderado', high: 'Riesgo alto' };
  const colorMap = {
    low:    'var(--color-success)',
    medium: 'var(--color-warn)',
    high:   'var(--color-danger)',
  };

  // Proyecciones basadas en curvas NASA (tasa lineal simplificada)
  // muscleStrength: -0.3%/día sin contramedida
  // aerobicCapacity: -29% en 60 días = -0.483%/día
  // El factor de riesgo escala la tasa: usuario con score 100 deteriora a tasa máxima;
  // usuario con score 0 deteriora a tasa ~0 (se mantiene activo).
  const riskFactor = rawRisk; // 0-1
  const STRENGTH_LOSS_RATE  = 0.3;  // %/día (Narici 1989, citado NASA 2001)
  const VO2_LOSS_RATE        = 0.483; // %/día (Kramer 2017, -29% en 60 días)

  const projectedStrengthLoss30d = +(riskFactor * STRENGTH_LOSS_RATE * 30).toFixed(1);
  const projectedVO2Loss30d      = +(riskFactor * VO2_LOSS_RATE * 30).toFixed(1);

  return {
    score,
    level,
    label:  labelMap[level],
    color:  colorMap[level],
    activeMinutesPerDay: Math.round(activeMinutesPerDay),
    deficitMinutes: Math.max(0, MIN_ACTIVE_MINUTES_PER_DAY - Math.round(activeMinutesPerDay)),
    projectedStrengthLoss30d,
    projectedVO2Loss30d,
  };
}

// ─── Persistencia ─────────────────────────────────────────────────────────────

/**
 * Guarda las respuestas y el score provisional en localStorage.
 * @param {{ hoursSeated, exerciseDays, exerciseMinutes }} answers
 * @param {object} scoreResult - Resultado de calculateProvisionalScore()
 */
export function saveOnboarding(answers, scoreResult) {
  const data = {
    answers,
    scoreResult,
    completedAt: Date.now(),
    isProvisional: true,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[Onboarding] No se pudo guardar:', err.message);
  }
}

/**
 * Carga el onboarding guardado, o null si no existe.
 * @returns {{ answers, scoreResult, completedAt, isProvisional }|null}
 */
export function loadOnboarding() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Indica si el usuario ya completó el onboarding.
 * @returns {boolean}
 */
export function hasCompletedOnboarding() {
  return loadOnboarding() !== null;
}
