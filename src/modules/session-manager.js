/**
 * session-manager.js
 * Controla el ciclo de vida de una sesión de actividad: idle → active → saved.
 *
 * ESTADOS:
 *   idle    — sin sesión activa, esperando que el usuario presione "Iniciar"
 *   active  — sesión en curso, acelerómetro contando pasos
 *   saved   — sesión finalizada y guardada, score del día actualizado
 *
 * PERSISTENCIA:
 *   Historial de sesiones del día en localStorage: 'valkbit_sessions_YYYY-MM-DD'
 *   Cada entrada: { id, startTime, endTime, steps, activeMinutes, durationMs }
 */

import {
  startSession,
  stopSession,
  onSessionTick,
  isSessionRunning,
  startMotionTracking,
  requestPermissionAndStart,
  isMotionAvailable,
} from './motion-tracker.js';

import { updateDayActiveMinutes } from './activity-manager.js';

// ─── Constantes ───────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'valkbit_sessions_';

// ─── Estado interno ───────────────────────────────────────────────────────────

const _state = {
  status: 'idle',   // 'idle' | 'active' | 'saved'
  lastSession: null,
  onStatusChange: null,  // cb({ status, session? })
  onTick: null,          // cb({ steps, activeMinutes, durationMs })
  motionReady: false,
};

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Prepara el sensor de movimiento. Debe llamarse DIRECTAMENTE desde un
 * event listener de click/touch — sin await intermedios entre el gesto
 * y esta llamada — para que iOS conceda el permiso correctamente.
 *
 * @returns {Promise<boolean>} true si el sensor quedó listo
 */
export async function prepareMotion() {
  if (_state.motionReady) return true;
  if (!isMotionAvailable()) {
    console.warn('[SessionMgr] DeviceMotion no disponible.');
    return false;
  }

  const result = await requestPermissionAndStart();
  _state.motionReady = (result === 'granted');
  return _state.motionReady;
}

/**
 * Inicia una nueva sesión de actividad.
 * @returns {Promise<boolean>} true si arrancó correctamente
 */
export async function beginSession() {
  if (_state.status === 'active') return true;

  // Asegurar sensor listo (primer uso o después de un stopSession)
  if (!_state.motionReady) {
    const ready = await prepareMotion();
    if (!ready) return false;
  }

  // Registrar callback de tick antes de startSession
  onSessionTick((data) => {
    if (typeof _state.onTick === 'function') _state.onTick(data);
  });

  const ok = startSession();
  if (!ok) return false;

  _state.status = 'active';
  _emit();
  return true;
}

/**
 * Finaliza la sesión activa y retorna las estadísticas SIN guardar todavía.
 * El usuario puede revisar el resumen antes de confirmar.
 *
 * @returns {{ steps, activeMinutes, durationMs, startTime, endTime }|null}
 */
export function endSession() {
  if (_state.status !== 'active') return null;

  const stats = stopSession();
  if (!stats) return null;

  _state.lastSession = stats;
  _state.status = 'saved';
  _emit();
  return stats;
}

/**
 * Persiste la última sesión finalizada en localStorage y actualiza el
 * activity-manager con los nuevos minutos activos del día.
 *
 * @returns {boolean} true si se guardó correctamente
 */
export function saveSession() {
  if (!_state.lastSession) return false;

  const session = { ..._state.lastSession, id: Date.now() };
  _persistSession(session);

  // Actualizar el registro del día con los minutos reales
  const todayMinutes = _getTodayTotalActiveMinutes();
  updateDayActiveMinutes(todayMinutes);

  console.info('[SessionMgr] Sesión guardada. Total minutos activos hoy:', todayMinutes);
  return true;
}

/**
 * Descarta la última sesión y vuelve a idle sin guardar.
 */
export function discardSession() {
  _state.lastSession = null;
  _state.status = 'idle';
  _emit();
}

/**
 * Vuelve al estado idle después de guardar (para iniciar otra sesión).
 */
export function resetToIdle() {
  _state.status = 'idle';
  _emit();
}

/**
 * Retorna el estado actual: 'idle' | 'active' | 'saved'
 */
export function getStatus() {
  return _state.status;
}

/**
 * Retorna todas las sesiones guardadas hoy.
 * @returns {Array}
 */
export function getTodaySessions() {
  return _loadSessions(_todayISO());
}

/**
 * Retorna los minutos activos totales del día (suma de todas las sesiones).
 * @returns {number}
 */
export function getTodayActiveMinutes() {
  return _getTodayTotalActiveMinutes();
}

/**
 * Registra un callback invocado cuando cambia el estado de la sesión.
 * @param {Function} cb - Recibe { status, session? }
 */
export function onStatusChange(cb) {
  _state.onStatusChange = cb;
}

/**
 * Registra un callback invocado en cada tick de la sesión activa.
 * @param {Function} cb - Recibe { steps, activeMinutes, durationMs }
 */
export function onTick(cb) {
  _state.onTick = cb;
}

// ─── Persistencia ─────────────────────────────────────────────────────────────

/** @private */
function _persistSession(session) {
  const key      = `${STORAGE_PREFIX}${_todayISO()}`;
  const existing = _loadSessions(_todayISO());
  existing.push(session);
  try {
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (err) {
    console.warn('[SessionMgr] Error al guardar sesión:', err.message);
  }
}

/** @private */
function _loadSessions(date) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${date}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** @private */
function _getTodayTotalActiveMinutes() {
  const sessions = _loadSessions(_todayISO());
  return sessions.reduce((sum, s) => sum + (s.activeMinutes ?? 0), 0);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** @private */
function _todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** @private */
function _emit() {
  if (typeof _state.onStatusChange === 'function') {
    _state.onStatusChange({
      status:  _state.status,
      session: _state.lastSession,
    });
  }
}
