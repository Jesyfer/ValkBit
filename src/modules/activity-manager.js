/**
 * activity-manager.js
 * Orquesta las tres fuentes de captura y produce un registro diario unificado.
 *
 * JERARQUÍA DE FUENTES (de mayor a menor prioridad):
 *   1. Bluetooth  — datos del wearable si la conexión está activa
 *   2. Motion     — acelerómetro del celular como respaldo automático
 *   3. Manual     — entrada del usuario como último recurso
 *
 * El registro diario se persiste en localStorage con clave por fecha (YYYY-MM-DD),
 * para que el motor de riesgo pueda calcular promedios móviles de 3-7 días.
 *
 * ESTRUCTURA de un DailyRecord:
 * {
 *   date: 'YYYY-MM-DD',
 *   activeMinutes: number,       // valor final combinado
 *   sources: {
 *     bluetooth: number|null,    // minutos activos estimados desde HR
 *     motion: number|null,       // minutos activos desde acelerómetro
 *     manual: number|null,       // minutos activos ingresados por el usuario
 *   },
 *   primarySource: 'bluetooth'|'motion'|'manual'|'none',
 *   updatedAt: number,           // timestamp Unix
 * }
 */

import {
  connectBluetooth,
  disconnectBluetooth,
  onBluetoothData,
  isBluetoothConnected,
  isBluetoothAvailable,
} from './bluetooth-tracker.js';

import {
  startMotionTracking,
  stopMotionTracking,
  onMotionData,
  isMotionAvailable,
} from './motion-tracker.js';

import {
  onManualData,
} from './manual-tracker.js';

// ─── Constantes ──────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'valkbit_activity_';

/**
 * Frecuencia cardiaca a partir de la cual se considera actividad moderada.
 * Referencia: ≥50% FC máxima estimada para adulto de 40 años → ~90 bpm.
 */
const HR_ACTIVE_THRESHOLD_BPM = 90;

// ─── Estado interno ──────────────────────────────────────────────────────────

const _state = {
  // Acumuladores de la sesión actual
  bluetooth: {
    activeMinutes: null,
    // Para estimar minutos activos desde HR: contamos intervalos activos
    _activeSamples: 0,
    _totalSamples: 0,
    _intervalTimer: null,
  },
  motion: { activeMinutes: null },
  manual: { activeMinutes: null },

  onUpdateCallback: null,
  sessionDate: _todayISO(),
};

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Inicializa el ActivityManager para la sesión de hoy.
 * Suscribe los callbacks a todos los módulos y arranca el sensor de movimiento.
 *
 * @returns {Promise<{ bluetoothStarted: boolean, motionStarted: boolean }>}
 */
export async function initActivityManager() {
  _state.sessionDate = _todayISO();

  // Suscribirse a datos de cada fuente
  onBluetoothData(_handleBluetoothData);
  onMotionData(_handleMotionData);
  onManualData(_handleManualData);

  // Intentar arrancar sensores del celular automáticamente (sin bloquear)
  // Nota: en iOS el permiso solo se puede pedir desde un gesto del usuario,
  // por eso aquí solo arrancamos si no se requiere permiso explícito.
  let motionStarted = false;
  if (isMotionAvailable()) {
    if (typeof DeviceMotionEvent?.requestPermission !== 'function') {
      // Android / desktop: arrancar directamente, no requiere permiso explícito
      motionStarted = startMotionTracking();
    }
    // iOS: el arranque ocurre en el gesto del usuario (btn-session-start)
  }

  // Bluetooth NO se inicia automáticamente: requiere gesto del usuario
  // (ver connectBluetooth en la UI)

  return { bluetoothStarted: false, motionStarted };
}

/**
 * Intenta conectar un wearable vía Bluetooth.
 * Si falla, el sistema ya tiene los sensores del celular activos como respaldo.
 *
 * @returns {Promise<boolean>} true si la conexión BLE fue exitosa
 */
export async function tryConnectBluetooth() {
  const connected = await connectBluetooth();
  if (connected) {
    // Iniciar contador periódico de minutos activos desde HR
    _startHeartRateTimer();
  }
  return connected;
}

/**
 * Registra un callback invocado cada vez que el registro diario se actualiza.
 * @param {Function} callback - Recibe el DailyRecord actualizado
 */
export function onActivityUpdate(callback) {
  _state.onUpdateCallback = callback;
}

/**
 * Retorna el registro diario actual (combinado de todas las fuentes).
 * @returns {DailyRecord}
 */
export function getTodayRecord() {
  return _buildRecord();
}

/**
 * Retorna los últimos N registros diarios guardados en localStorage.
 * @param {number} [days=7]
 * @returns {DailyRecord[]}
 */
export function getRecentRecords(days = 7) {
  const records = [];
  for (let i = 0; i < days; i++) {
    const date = _dateOffsetISO(-i);
    const stored = _loadRecord(date);
    if (stored) records.push(stored);
  }
  return records;
}

/**
 * Actualiza los minutos activos del día con datos reales de sesión.
 * A diferencia de seedOnboardingRecord, esta función siempre pisa el valor
 * anterior porque viene de datos reales del sensor.
 *
 * @param {number} activeMinutes - Total de minutos activos reales del día
 */
export function updateDayActiveMinutes(activeMinutes) {
  const today = _todayISO();
  const existing = _loadRecord(today) ?? {};

  const record = {
    ...existing,
    date: today,
    activeMinutes,
    primarySource: 'motion',
    isProvisional: false,
    updatedAt: Date.now(),
  };

  _persistRecord(record);
  console.info('[ActivityManager] Minutos activos reales actualizados:', activeMinutes);
}

/**
 * Siembra un registro provisional del día a partir del onboarding (Historia 1).
 * Solo se aplica si NO existe ya un registro real para hoy.
 *
 * El registro queda marcado como 'onboarding' en primarySource para que el
 * motor de riesgo sepa que es una estimación y no datos de sensores.
 *
 * @param {number} activeMinutesPerDay - Estimación del onboarding
 */
export function seedOnboardingRecord(activeMinutesPerDay) {
  const today = _todayISO();
  const existing = _loadRecord(today);

  // No pisar un registro real que ya tenga datos de sensores
  if (existing && existing.primarySource !== 'onboarding' && existing.primarySource !== 'none') {
    console.info('[ActivityManager] Registro real ya existe para hoy, no se pisa con onboarding.');
    return;
  }

  const record = {
    date: today,
    activeMinutes: activeMinutesPerDay,
    sources: { bluetooth: null, motion: null, manual: null },
    primarySource: 'onboarding',
    isProvisional: true,
    updatedAt: Date.now(),
  };

  _persistRecord(record);
  console.info('[ActivityManager] Registro provisional de onboarding guardado:', record);
}

/**
 * Detiene todos los sensores activos y guarda el registro del día.
 */
export function stopAndSave() {
  stopMotionTracking();
  if (isBluetoothConnected()) disconnectBluetooth();
  clearInterval(_state.bluetooth._intervalTimer);
  _persistRecord(_buildRecord());
  console.info('[ActivityManager] Registro guardado:', _buildRecord());
}

// ─── Handlers de datos entrantes ─────────────────────────────────────────────

/** @private */
function _handleBluetoothData({ heartRate }) {
  _state.bluetooth._totalSamples++;
  if (heartRate >= HR_ACTIVE_THRESHOLD_BPM) {
    _state.bluetooth._activeSamples++;
  }
}

/** @private */
function _handleMotionData({ activeMinutes }) {
  _state.motion.activeMinutes = activeMinutes;
  _emitUpdate();
}

/** @private */
function _handleManualData({ activeMinutes }) {
  _state.manual.activeMinutes = activeMinutes;
  _emitUpdate();
}

// ─── Estimación de minutos activos desde HR ──────────────────────────────────

/**
 * Arranca un timer que cada minuto calcula los minutos activos acumulados
 * a partir de la proporción de muestras de HR por encima del umbral.
 * @private
 */
function _startHeartRateTimer() {
  clearInterval(_state.bluetooth._intervalTimer);
  _state.bluetooth._activeSamples = 0;
  _state.bluetooth._totalSamples = 0;

  _state.bluetooth._intervalTimer = setInterval(() => {
    const { _activeSamples, _totalSamples } = _state.bluetooth;
    if (_totalSamples === 0) return;

    const activeRatio = _activeSamples / _totalSamples;
    // Aproximar minutos activos: cada minuto que pasa, si >50% de muestras
    // estuvieron por encima del umbral → cuenta como 1 minuto activo.
    const elapsedMinutes = Math.round(
      (_totalSamples / 3) // ~3 muestras/seg × 60s = ~180 muestras/min
    );
    _state.bluetooth.activeMinutes = Math.round(elapsedMinutes * activeRatio);
    _emitUpdate();
  }, 60_000); // evaluar cada minuto
}

// ─── Combinación y persistencia ───────────────────────────────────────────────

/**
 * Construye el registro diario combinando las tres fuentes según la jerarquía.
 * @returns {DailyRecord}
 * @private
 */
function _buildRecord() {
  const bt = _state.bluetooth.activeMinutes;
  const mo = _state.motion.activeMinutes;
  const ma = _state.manual.activeMinutes;

  let activeMinutes = 0;
  let primarySource = 'none';

  if (bt !== null && bt > 0) {
    // BLE conectado y reportando actividad: fuente principal
    // Complementar con motion si es mayor (wearable a veces subestima)
    activeMinutes = mo !== null ? Math.max(bt, mo) : bt;
    primarySource = 'bluetooth';
  } else if (mo !== null && mo > 0) {
    // Sin BLE: acelerómetro del celular como fuente principal
    activeMinutes = mo;
    primarySource = 'motion';
  } else if (ma !== null && ma > 0) {
    // Sin sensores: lo que ingresó el usuario manualmente
    activeMinutes = ma;
    primarySource = 'manual';
  }

  // Si hay entrada manual, sumarla cuando NO es la única fuente
  // (el usuario puede añadir ejercicio que los sensores no captaron)
  if (primarySource !== 'manual' && ma !== null && ma > 0) {
    activeMinutes = Math.max(activeMinutes, ma);
  }

  return {
    date: _state.sessionDate,
    activeMinutes,
    sources: { bluetooth: bt, motion: mo, manual: ma },
    primarySource,
    updatedAt: Date.now(),
  };
}

/** @private */
function _emitUpdate() {
  const record = _buildRecord();
  _persistRecord(record);
  if (typeof _state.onUpdateCallback === 'function') {
    _state.onUpdateCallback(record);
  }
}

/** @private */
function _persistRecord(record) {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${record.date}`,
      JSON.stringify(record)
    );
  } catch (err) {
    console.warn('[ActivityManager] No se pudo guardar en localStorage:', err.message);
  }
}

/** @private */
function _loadRecord(date) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${date}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Utilidades de fecha ──────────────────────────────────────────────────────

/** @private */
function _todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** @private */
function _dateOffsetISO(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
