/**
 * onboarding.js
 * Cuestionario de cold-start (Historia 1).
 *
 * PROPÓSITO:
 *   Recopilar una estimación rápida del nivel de actividad del usuario
 *   el día 1 (antes de datos de sensores). Delega el cálculo del score
 *   a risk-engine.js, que lee las constantes de data/reference-curves.json.
 *
 * PREGUNTAS:
 *   1. hoursSeated    — horas promedio sentado por día (0-16)
 *   2. exerciseDays   — días por semana con ejercicio (0-7)
 *   3. exerciseMinutes — minutos promedio por sesión (0-180)
 */

import { calculateRiskScore } from './risk-engine.js';

// ─── Constantes ──────────────────────────────────────────────────────────────

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

// ─── Cálculo del score (delegado a risk-engine.js) ────────────────────────────

/**
 * Calcula el score de riesgo provisional a partir de las respuestas del onboarding.
 * Delega toda la lógica de cálculo a risk-engine.js (fuente única de verdad).
 *
 * @param {{ hoursSeated: number, exerciseDays: number, exerciseMinutes: number }} answers
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
export function calculateProvisionalScore(answers) {
  const { hoursSeated, exerciseDays, exerciseMinutes } = answers;

  // Minutos activos diarios estimados desde el cuestionario
  const activeMinutesPerDay = (exerciseDays * exerciseMinutes) / 7;

  return calculateRiskScore({ activeMinutesPerDay, hoursSeated });
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
