/**
 * recommendations.js
 * Motor de recomendaciones de ejercicio (Historia 4).
 *
 * Genera recomendaciones concretas basadas en el nivel de riesgo,
 * inspiradas en protocolos reales de contramedida (ARED, Kramer 2017).
 * Cada recomendación es un objeto marcable (completada/no) cuyo valor
 * en minutos activos se suma al score al completarse.
 */

// ─── Catálogo de recomendaciones ──────────────────────────────────────────────

/**
 * @typedef {Object} Recommendation
 * @property {string} id         - Identificador único
 * @property {string} text       - Descripción del ejercicio
 * @property {number} minutes    - Minutos activos equivalentes al completarla
 * @property {'low'|'medium'|'high'} minLevel - Nivel mínimo de riesgo para mostrarla
 * @property {string} source     - Referencia científica abreviada
 */

/** @type {Recommendation[]} */
const CATALOG = [
  {
    id: 'walk-30',
    text: 'Caminar 30 minutos a paso rápido',
    minutes: 30,
    minLevel: 'medium',
    source: 'OMS Guidelines on Physical Activity 2020',
  },
  {
    id: 'squat-set',
    text: 'Hacer 3 series de 10 sentadillas (con o sin peso)',
    minutes: 10,
    minLevel: 'medium',
    source: 'Protocolo ARED simplificado — NASA HRP',
  },
  {
    id: 'jump-training',
    text: 'Realizar 4 series de 10 saltos reactivos (countermovement jumps)',
    minutes: 15,
    minLevel: 'high',
    source: 'Kramer et al. 2017 — entrenamiento de salto validado en 60 días de bed-rest',
  },
  {
    id: 'stairs-10',
    text: 'Subir escaleras durante 10 minutos (o 5 pisos × 2 veces)',
    minutes: 10,
    minLevel: 'medium',
    source: 'NASA HRP Evidence Report: Aerobic and Muscle (2024)',
  },
  {
    id: 'deadlift-set',
    text: 'Hacer 3 series de 8 peso muerto (o hip hinge con mochila pesada)',
    minutes: 12,
    minLevel: 'high',
    source: 'Protocolo ARED — ejercicio resistivo de cadena posterior',
  },
  {
    id: 'stretch-break',
    text: 'Levantarse y estirarse 5 minutos cada hora de trabajo sentado',
    minutes: 5,
    minLevel: 'medium',
    source: 'OMS Guidelines on Physical Activity 2020',
  },
];

// ─── Estado ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'valkbit_recommendations';

/**
 * @typedef {Object} RecommendationState
 * @property {string} id
 * @property {string} text
 * @property {number} minutes
 * @property {string} source
 * @property {boolean} completed
 * @property {number|null} completedAt
 */

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Genera las recomendaciones para el nivel de riesgo actual.
 * Retorna hasta 3 recomendaciones aplicables, priorizando las de mayor impacto.
 *
 * @param {'low'|'medium'|'high'} level - Nivel de riesgo actual
 * @returns {RecommendationState[]}
 */
export function getRecommendations(level) {
  const saved = _loadState();

  // Filtrar catálogo por nivel
  const levelOrder = { low: 0, medium: 1, high: 2 };
  const userLevel = levelOrder[level] ?? 0;

  const applicable = CATALOG.filter(r => levelOrder[r.minLevel] <= userLevel);

  // Mapear a estado (preservar completadas del día de hoy)
  const today = new Date().toISOString().slice(0, 10);

  return applicable.slice(0, 3).map(rec => {
    const existing = saved.find(s => s.id === rec.id && s.date === today);
    return {
      id: rec.id,
      text: rec.text,
      minutes: rec.minutes,
      source: rec.source,
      completed: existing?.completed ?? false,
      completedAt: existing?.completedAt ?? null,
    };
  });
}

/**
 * Marca una recomendación como completada y persiste el cambio.
 *
 * @param {string} id - ID de la recomendación
 * @returns {RecommendationState|null} La recomendación actualizada, o null si no existe
 */
export function markCompleted(id) {
  const saved = _loadState();
  const today = new Date().toISOString().slice(0, 10);

  // Buscar en catálogo
  const rec = CATALOG.find(r => r.id === id);
  if (!rec) return null;

  // Actualizar o crear entrada
  const existingIdx = saved.findIndex(s => s.id === id && s.date === today);
  const entry = {
    id,
    date: today,
    completed: true,
    completedAt: Date.now(),
  };

  if (existingIdx >= 0) {
    saved[existingIdx] = entry;
  } else {
    saved.push(entry);
  }

  _saveState(saved);

  return {
    id: rec.id,
    text: rec.text,
    minutes: rec.minutes,
    source: rec.source,
    completed: true,
    completedAt: entry.completedAt,
  };
}

/**
 * Desmarca una recomendación (por si el usuario se equivocó).
 *
 * @param {string} id
 * @returns {boolean} true si se desmarcó correctamente
 */
export function unmarkCompleted(id) {
  const saved = _loadState();
  const today = new Date().toISOString().slice(0, 10);

  const idx = saved.findIndex(s => s.id === id && s.date === today);
  if (idx >= 0) {
    saved.splice(idx, 1);
    _saveState(saved);
    return true;
  }
  return false;
}

/**
 * Calcula los minutos activos bonus por recomendaciones completadas hoy.
 * Se suman al total de minutos del día para recalcular el score.
 *
 * @returns {number} Minutos extra por ejercicios completados hoy
 */
export function getCompletedBonusMinutes() {
  const saved = _loadState();
  const today = new Date().toISOString().slice(0, 10);

  const completedToday = saved.filter(s => s.completed && s.date === today);

  return completedToday.reduce((sum, entry) => {
    const rec = CATALOG.find(r => r.id === entry.id);
    return sum + (rec?.minutes ?? 0);
  }, 0);
}

// ─── Persistencia ─────────────────────────────────────────────────────────────

/** @private */
function _loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** @private */
function _saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[Recommendations] No se pudo guardar:', err.message);
  }
}
