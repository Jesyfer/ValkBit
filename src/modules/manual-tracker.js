/**
 * manual-tracker.js
 * Captura manual de actividad física.
 *
 * El usuario ingresa sus datos directamente (pasos o minutos activos)
 * consultando la app de su propio wearable (ej. Huawei Health, Fitbit, etc.).
 *
 * Este módulo no tiene lógica de sensor: su responsabilidad es validar
 * la entrada, normalizarla a minutos activos, y exponerla al ActivityManager.
 *
 * CUÁNDO SE ACTIVA:
 *   - Cuando Bluetooth falla o el usuario cancela el diálogo.
 *   - Como opción adicional incluso si hay datos automáticos.
 */

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Pasos por minuto de referencia para convertir pasos → minutos activos. */
const STEPS_PER_ACTIVE_MINUTE = 100;

/** Límites de validación para evitar entradas absurdas. */
const LIMITS = {
  steps: { min: 0, max: 100_000 },
  activeMinutes: { min: 0, max: 1_440 }, // max = 24 horas
};

// ─── Estado interno ──────────────────────────────────────────────────────────

const _state = {
  lastEntry: null, // { type, rawValue, activeMinutes, timestamp }
  onDataCallback: null,
};

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Registra una entrada manual del usuario.
 *
 * @param {'steps'|'activeMinutes'} type - Qué dato ingresa el usuario.
 * @param {number} value - Valor numérico ingresado.
 * @returns {{ ok: boolean, activeMinutes: number, error?: string }}
 */
export function submitManualEntry(type, value) {
  const validation = _validate(type, value);
  if (!validation.ok) {
    return validation;
  }

  const activeMinutes = type === 'steps'
    ? Math.round(value / STEPS_PER_ACTIVE_MINUTE)
    : Math.round(value);

  const entry = {
    type,
    rawValue: value,
    activeMinutes,
    timestamp: Date.now(),
  };

  _state.lastEntry = entry;

  if (typeof _state.onDataCallback === 'function') {
    _state.onDataCallback({
      source: 'manual',
      steps: type === 'steps' ? value : null,
      activeMinutes,
      timestamp: entry.timestamp,
    });
  }

  console.info(`[Manual] Entrada registrada: ${value} ${type} → ${activeMinutes} min activos`);
  return { ok: true, activeMinutes };
}

/**
 * Registra un callback que se invoca cuando el usuario guarda una entrada.
 * @param {Function} callback - Recibe { source, steps, activeMinutes, timestamp }
 */
export function onManualData(callback) {
  _state.onDataCallback = callback;
}

/**
 * Retorna la última entrada manual registrada, o null si no hay ninguna.
 * @returns {{ type: string, rawValue: number, activeMinutes: number, timestamp: number }|null}
 */
export function getLastManualEntry() {
  return _state.lastEntry;
}

/**
 * Retorna los minutos activos de la última entrada manual, o 0 si no hay.
 * @returns {number}
 */
export function getManualActiveMinutes() {
  return _state.lastEntry?.activeMinutes ?? 0;
}

// ─── Validación ───────────────────────────────────────────────────────────────

/**
 * Valida que el tipo y valor ingresados sean coherentes.
 * @param {string} type
 * @param {number} value
 * @returns {{ ok: boolean, error?: string }}
 * @private
 */
function _validate(type, value) {
  if (type !== 'steps' && type !== 'activeMinutes') {
    return { ok: false, error: `Tipo inválido: "${type}". Usar "steps" o "activeMinutes".` };
  }

  const num = Number(value);
  if (!Number.isFinite(num)) {
    return { ok: false, error: 'El valor debe ser un número.' };
  }

  const { min, max } = LIMITS[type];
  if (num < min || num > max) {
    return {
      ok: false,
      error: `Valor fuera de rango para ${type}: debe estar entre ${min} y ${max}.`,
    };
  }

  return { ok: true };
}
