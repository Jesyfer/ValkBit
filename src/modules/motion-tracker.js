/**
 * motion-tracker.js
 * Captura actividad física usando los sensores del celular (DeviceMotionEvent).
 *
 * ALGORITMO:
 *   1. Muestrea la aceleración lineal del dispositivo a ~50 Hz.
 *   2. Calcula la magnitud del vector de aceleración en cada muestra.
 *   3. Aplica un filtro de paso de banda simple (~0.5–3 Hz) para aislar
 *      el patrón rítmico de caminar/correr y descartar:
 *        - DC offset (gravedad residual, <0.5 Hz)
 *        - Manipulación casual del teléfono y vibraciones aleatorias (>3 Hz)
 *   4. Detecta pasos contando cruces por cero de la señal filtrada con un
 *      umbral mínimo de amplitud, para evitar falsos positivos.
 *   5. Convierte pasos → minutos activos con una cadencia de referencia
 *      de ~100 pasos/min (caminata moderada).
 *
 * PERMISOS:
 *   - Android Chrome: acceso automático tras conceder permiso de sensor.
 *   - iOS 13+ Safari: requiere llamar requestMotionPermission() desde un
 *     gesto del usuario (touch/click). Ver design.md → riesgos técnicos.
 *
 * Referencia de frecuencia de paso: 1–2 Hz ≈ 60–120 pasos/min (caminar normal).
 */

// ─── Constantes de configuración ────────────────────────────────────────────

/** Frecuencia de muestreo objetivo (ms entre muestras). */
const SAMPLE_INTERVAL_MS = 20; // ~50 Hz

/** Ventana de análisis para cada segmento de actividad (ms). */
const ANALYSIS_WINDOW_MS = 5_000; // 5 segundos

/** Umbral mínimo de amplitud (m/s²) para contar un cruce como paso válido. */
const STEP_AMPLITUDE_THRESHOLD = 0.8;

/** Cadencia de referencia para convertir pasos a tiempo activo (pasos/min). */
const REFERENCE_CADENCE_STEPS_PER_MIN = 100;

/** Coeficiente del filtro pasa-altas (high-pass, elimina DC y <0.5 Hz). */
const HP_ALPHA = 0.9;

/** Coeficiente del filtro pasa-bajas (low-pass, elimina >3 Hz). */
const LP_ALPHA = 0.1;

// ─── Estado interno ──────────────────────────────────────────────────────────

const _state = {
  // Conteo de fondo (todo el día)
  active: false,
  samples: [],           // { magnitude: number, timestamp: number }[]
  stepCount: 0,
  activeMinutes: 0,
  analysisTimer: null,
  onDataCallback: null,

  // Modo sesión (inicio/fin explícito del usuario)
  session: {
    running: false,
    startTime: null,
    stepCountAtStart: 0,   // pasos del contador de fondo al iniciar la sesión
    onTickCallback: null,  // se llama cada ventana con los datos de la sesión
  },

  // Variables del filtro doble (high-pass + low-pass en cascada)
  _hpPrev: 0,
  _lpPrev: 0,
  _rawPrev: 0,
};

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Verifica si DeviceMotionEvent está disponible en este entorno.
 * @returns {boolean}
 */
export function isMotionAvailable() {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
}

/**
 * Diagnóstico del sensor: verifica disponibilidad, permisos y si llegan datos.
 * Retorna un objeto con el estado detallado para mostrar en la UI.
 *
 * @returns {Promise<{
 *   available: boolean,
 *   permissionRequired: boolean,
 *   permissionGranted: boolean,
 *   receivingData: boolean,
 *   accelerationNull: boolean,
 *   isHttps: boolean,
 *   detail: string
 * }>}
 */
export async function diagnoseSensor() {
  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const available = isMotionAvailable();
  const permissionRequired = typeof DeviceMotionEvent?.requestPermission === 'function';

  if (!available) {
    return { available: false, permissionRequired: false, permissionGranted: false,
             receivingData: false, accelerationNull: false, isHttps,
             detail: 'DeviceMotionEvent no existe en este navegador.' };
  }

  if (!isHttps) {
    return { available, permissionRequired, permissionGranted: false,
             receivingData: false, accelerationNull: false, isHttps,
             detail: 'La página debe servirse por HTTPS (o localhost) para acceder al sensor.' };
  }

  // Probar si llegan eventos reales en 2 segundos
  return new Promise((resolve) => {
    let received = false;
    let accelNull = false;

    const handler = (e) => {
      received = true;
      const acc = e.acceleration ?? e.accelerationIncludingGravity;
      accelNull = !acc || (acc.x === null && acc.y === null && acc.z === null);
      window.removeEventListener('devicemotion', handler);
      clearTimeout(timeout);
      resolve({
        available, permissionRequired, permissionGranted: true,
        receivingData: true, accelerationNull: accelNull, isHttps,
        detail: accelNull
          ? 'El sensor responde pero todos los valores son null. El hardware puede estar bloqueado por el sistema.'
          : 'Sensor funcionando correctamente.',
      });
    };

    const timeout = setTimeout(() => {
      window.removeEventListener('devicemotion', handler);
      resolve({
        available, permissionRequired, permissionGranted: true,
        receivingData: false, accelerationNull: false, isHttps,
        detail: 'El sensor está registrado pero no llegan eventos. Posible causa: navegador bloqueando el sensor, o dispositivo sin acelerómetro.',
      });
    }, 2000);

    window.addEventListener('devicemotion', handler);
  });
}

/**
 * Solicita permiso de movimiento en iOS 13+ Y arranca el tracking en un solo
 * paso. Debe llamarse DIRECTAMENTE desde un event listener de click/touch,
 * sin await intermedios, para que iOS reconozca el gesto del usuario.
 *
 * @returns {Promise<'granted'|'denied'|'not-required'|'unavailable'>}
 */
export async function requestPermissionAndStart() {
  if (!isMotionAvailable()) return 'unavailable';

  // iOS 13+: pedir permiso explícito directo en este mismo frame de gesto
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    let result;
    try {
      result = await DeviceMotionEvent.requestPermission();
    } catch (err) {
      console.warn('[Motion] Error al pedir permiso iOS:', err.message);
      return 'denied';
    }
    if (result !== 'granted') {
      console.warn('[Motion] Permiso denegado por el usuario.');
      return 'denied';
    }
  }

  // Android / desktop: no hace falta permiso, arrancar directamente
  const started = startMotionTracking();
  return started ? 'granted' : 'denied';
}

/**
 * Inicia la captura de datos del acelerómetro.
 * Devuelve false si el sensor no está disponible.
 *
 * @returns {boolean}
 */
export function startMotionTracking() {
  if (!isMotionAvailable()) {
    console.warn('[Motion] DeviceMotionEvent no disponible.');
    return false;
  }
  if (_state.active) {
    console.warn('[Motion] Ya está activo.');
    return true;
  }

  _resetFilters();
  _state.active = true;
  _state.samples = [];
  _state.stepCount = 0;

  window.addEventListener('devicemotion', _onDeviceMotion);

  // Analizar acumulado cada ANALYSIS_WINDOW_MS
  _state.analysisTimer = setInterval(_analyzeWindow, ANALYSIS_WINDOW_MS);

  console.info('[Motion] Captura iniciada.');
  return true;
}

/**
 * Detiene la captura del acelerómetro.
 */
export function stopMotionTracking() {
  if (!_state.active) return;

  window.removeEventListener('devicemotion', _onDeviceMotion);
  clearInterval(_state.analysisTimer);
  _state.active = false;
  console.info('[Motion] Captura detenida. Pasos totales:', _state.stepCount);
}

/**
 * Registra un callback invocado cada vez que se actualiza la estimación.
 * @param {Function} callback - Recibe { source, steps, activeMinutes, timestamp }
 */
export function onMotionData(callback) {
  _state.onDataCallback = callback;
}

/**
 * Retorna los minutos activos acumulados en la sesión actual.
 * @returns {number}
 */
export function getActiveMinutes() {
  return _state.activeMinutes;
}

/**
 * Retorna el conteo de pasos detectados en la sesión actual.
 * @returns {number}
 */
export function getStepCount() {
  return _state.stepCount;
}

/**
 * Resetea los contadores de la sesión (útil al inicio de un nuevo día).
 */
export function resetMotionSession() {
  _state.stepCount = 0;
  _state.activeMinutes = 0;
  _state.samples = [];
  _resetFilters();
}

// ─── API de sesión (inicio/fin explícito) ─────────────────────────────────────

/**
 * Inicia una sesión de actividad explícita.
 * El acelerómetro debe estar ya corriendo (startMotionTracking).
 * Si no está corriendo, lo inicia automáticamente.
 *
 * @returns {boolean} true si la sesión arrancó correctamente
 */
export function startSession() {
  if (_state.session.running) {
    console.warn('[Motion] Sesión ya en curso.');
    return true;
  }

  // Asegurar que el sensor esté activo
  if (!_state.active) {
    const started = startMotionTracking();
    if (!started) return false;
  }

  _state.session.running       = true;
  _state.session.startTime     = Date.now();
  _state.session.stepCountAtStart = _state.stepCount;

  console.info('[Motion] Sesión iniciada.');
  return true;
}

/**
 * Finaliza la sesión activa y retorna las estadísticas.
 *
 * @returns {{
 *   steps: number,
 *   activeMinutes: number,
 *   durationMs: number,
 *   startTime: number,
 *   endTime: number
 * }|null} null si no había sesión activa
 */
export function stopSession() {
  if (!_state.session.running) {
    console.warn('[Motion] No hay sesión activa.');
    return null;
  }

  const endTime   = Date.now();
  const steps     = _state.stepCount - _state.session.stepCountAtStart;
  const activeMin = Math.round(steps / REFERENCE_CADENCE_STEPS_PER_MIN);

  _state.session.running = false;

  const stats = {
    steps,
    activeMinutes: activeMin,
    durationMs:    endTime - _state.session.startTime,
    startTime:     _state.session.startTime,
    endTime,
  };

  console.info('[Motion] Sesión finalizada:', stats);
  return stats;
}

/**
 * Indica si hay una sesión de actividad en curso.
 * @returns {boolean}
 */
export function isSessionRunning() {
  return _state.session.running;
}

/**
 * Retorna los pasos acumulados solo durante la sesión activa.
 * @returns {number}
 */
export function getSessionSteps() {
  if (!_state.session.running) return 0;
  return _state.stepCount - _state.session.stepCountAtStart;
}

/**
 * Registra un callback que se llama cada ventana de análisis mientras
 * hay una sesión activa. Recibe los datos de la sesión en curso.
 * @param {Function} callback - Recibe { steps, activeMinutes, durationMs }
 */
export function onSessionTick(callback) {
  _state.session.onTickCallback = callback;
}

// ─── Lógica interna ──────────────────────────────────────────────────────────

/**
 * Handler del evento DeviceMotion.
 * Aplica el filtro y almacena la muestra.
 * @param {DeviceMotionEvent} event
 * @private
 */
function _onDeviceMotion(event) {
  // accelerationIncludingGravity como fallback si acceleration es null
  const acc = event.acceleration ?? event.accelerationIncludingGravity;
  if (!acc) return;

  const x = acc.x ?? 0;
  const y = acc.y ?? 0;
  const z = acc.z ?? 0;

  // Magnitud del vector de aceleración
  const raw = Math.sqrt(x * x + y * y + z * z);

  // Filtro high-pass: elimina componente DC (gravedad y movimientos <0.5 Hz)
  const hp = HP_ALPHA * (_state._hpPrev + raw - _state._rawPrev);
  _state._rawPrev = raw;
  _state._hpPrev = hp;

  // Filtro low-pass: suaviza el ruido de alta frecuencia (>3 Hz)
  const lp = _state._lpPrev + LP_ALPHA * (hp - _state._lpPrev);
  _state._lpPrev = lp;

  _state.samples.push({ magnitude: lp, timestamp: Date.now() });
}

/**
 * Analiza la ventana de muestras acumulada para detectar pasos.
 * Usa detección de cruces por cero con umbral de amplitud.
 * @private
 */
function _analyzeWindow() {
  const samples = _state.samples.splice(0); // consume y vacía el buffer
  if (samples.length < 10) return;

  const stepsInWindow = _detectSteps(samples);
  _state.stepCount += stepsInWindow;

  // Convertir pasos acumulados a minutos activos totales
  _state.activeMinutes = Math.round(_state.stepCount / REFERENCE_CADENCE_STEPS_PER_MIN);

  if (stepsInWindow > 0 && typeof _state.onDataCallback === 'function') {
    _state.onDataCallback({
      source: 'motion',
      steps: _state.stepCount,
      activeMinutes: _state.activeMinutes,
      timestamp: Date.now(),
    });
  }

  // Emitir tick de sesión si hay una activa
  if (_state.session.running && typeof _state.session.onTickCallback === 'function') {
    const sessionSteps = _state.stepCount - _state.session.stepCountAtStart;
    _state.session.onTickCallback({
      steps:         sessionSteps,
      activeMinutes: Math.round(sessionSteps / REFERENCE_CADENCE_STEPS_PER_MIN),
      durationMs:    Date.now() - _state.session.startTime,
    });
  }
}

/**
 * Detecta pasos en un arreglo de muestras usando cruces por cero.
 *
 * Un "paso" se cuenta cuando la señal filtrada:
 *   1. Supera el umbral de amplitud positivo (pico ascendente)
 *   2. Luego cruza el cero hacia abajo
 *
 * Esto evita doble conteo por cada ciclo de oscilación.
 *
 * @param {{ magnitude: number, timestamp: number }[]} samples
 * @returns {number} Número de pasos detectados
 * @private
 */
function _detectSteps(samples) {
  let steps = 0;
  let peakDetected = false;

  for (let i = 0; i < samples.length; i++) {
    const val = samples[i].magnitude;

    if (val > STEP_AMPLITUDE_THRESHOLD) {
      peakDetected = true;
    }

    // Cruce por cero descendente después de un pico válido = 1 paso
    if (peakDetected && val < 0) {
      steps++;
      peakDetected = false;
    }
  }

  return steps;
}

/**
 * Reinicia las variables internas del filtro.
 * @private
 */
function _resetFilters() {
  _state._hpPrev = 0;
  _state._lpPrev = 0;
  _state._rawPrev = 0;
}
