/**
 * bluetooth-tracker.js
 * Módulo de captura de actividad vía Web Bluetooth.
 *
 * Intenta conectar con cualquier wearable que exponga los servicios BLE estándar:
 *   - heart_rate  (0x180D) → principal señal de actividad
 *   - fitness_machine (0x1826) → equipos de cardio con FTMS
 *
 * Si la conexión falla o el usuario cancela el diálogo, resuelve con null
 * para que el ActivityManager active el siguiente respaldo.
 *
 * Referencia del diseño: no asumir marca específica; el Huawei Band 10 probado
 * no expone servicios BLE estándar (ver design.md).
 */

const BLE_SERVICES = ['heart_rate', 'fitness_machine'];

/**
 * Estado interno del módulo.
 * @type {{ device: BluetoothDevice|null, server: BluetoothRemoteGATTServer|null,
 *          heartRateChar: BluetoothRemoteGATTCharacteristic|null,
 *          onDataCallback: Function|null, lastHeartRate: number|null }}
 */
const _state = {
  device: null,
  server: null,
  heartRateChar: null,
  onDataCallback: null,
  lastHeartRate: null,
};

/**
 * Verifica si la API Web Bluetooth está disponible en el navegador.
 * @returns {boolean}
 */
export function isBluetoothAvailable() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Solicita al usuario conectar un wearable BLE.
 * Abre el diálogo nativo del navegador y filtra por servicios estándar.
 *
 * @returns {Promise<boolean>} true si la conexión fue exitosa, false si falló o
 *                             el usuario canceló.
 */
export async function connectBluetooth() {
  if (!isBluetoothAvailable()) {
    console.warn('[BT] Web Bluetooth no disponible en este navegador.');
    return false;
  }

  try {
    _state.device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: ['heart_rate'] },
      ],
      // optionalServices permite leer características sin que el dispositivo
      // los declare como primarios (mejora compatibilidad).
      optionalServices: ['fitness_machine', 'device_information'],
    });

    _state.device.addEventListener('gattserverdisconnected', _onDisconnected);

    _state.server = await _state.device.gatt.connect();
    console.info(`[BT] Conectado a: ${_state.device.name ?? 'dispositivo sin nombre'}`);

    await _subscribeHeartRate();
    return true;
  } catch (err) {
    // NotFoundError → usuario canceló el diálogo o no hay dispositivo
    // SecurityError  → permisos no concedidos
    console.warn(`[BT] Conexión fallida (${err.name}): ${err.message}`);
    _reset();
    return false;
  }
}

/**
 * Suscribe a las notificaciones de frecuencia cardiaca (característica 0x2A37).
 * @private
 */
async function _subscribeHeartRate() {
  try {
    const service = await _state.server.getPrimaryService('heart_rate');
    _state.heartRateChar = await service.getCharacteristic('heart_rate_measurement');
    await _state.heartRateChar.startNotifications();
    _state.heartRateChar.addEventListener('characteristicvaluechanged', _onHeartRateData);
    console.info('[BT] Suscrito a Heart Rate Measurement.');
  } catch (err) {
    console.warn('[BT] No se pudo suscribir a heart_rate_measurement:', err.message);
  }
}

/**
 * Handler de datos de frecuencia cardiaca.
 * El formato sigue la especificación Bluetooth GATT (flags + valor).
 * @param {Event} event
 * @private
 */
function _onHeartRateData(event) {
  const value = event.target.value; // DataView
  const flags = value.getUint8(0);
  // Bit 0 del flags: 0 → HR en Uint8, 1 → HR en Uint16
  const heartRate = (flags & 0x01) === 0
    ? value.getUint8(1)
    : value.getUint16(1, /* littleEndian */ true);

  _state.lastHeartRate = heartRate;

  if (typeof _state.onDataCallback === 'function') {
    _state.onDataCallback({ source: 'bluetooth', heartRate, timestamp: Date.now() });
  }
}

/**
 * Handler de desconexión inesperada del dispositivo.
 * @private
 */
function _onDisconnected() {
  console.warn('[BT] Dispositivo desconectado inesperadamente.');
  _reset();
}

/**
 * Registra un callback que se invoca cada vez que llega un nuevo dato BLE.
 * @param {Function} callback - Recibe { source, heartRate, timestamp }
 */
export function onBluetoothData(callback) {
  _state.onDataCallback = callback;
}

/**
 * Desconecta el dispositivo BLE y limpia el estado.
 */
export function disconnectBluetooth() {
  if (_state.heartRateChar) {
    _state.heartRateChar.removeEventListener('characteristicvaluechanged', _onHeartRateData);
  }
  if (_state.server?.connected) {
    _state.server.disconnect();
  }
  _reset();
  console.info('[BT] Desconectado manualmente.');
}

/**
 * Retorna la última frecuencia cardiaca recibida, o null si no hay datos.
 * @returns {number|null}
 */
export function getLastHeartRate() {
  return _state.lastHeartRate;
}

/**
 * Retorna si hay una conexión BLE activa en este momento.
 * @returns {boolean}
 */
export function isBluetoothConnected() {
  return _state.server?.connected === true;
}

/** @private */
function _reset() {
  _state.device = null;
  _state.server = null;
  _state.heartRateChar = null;
  _state.lastHeartRate = null;
}
