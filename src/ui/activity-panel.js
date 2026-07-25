/**
 * activity-panel.js
 * Componente UI que orquesta el flujo de captura de actividad.
 *
 * FLUJO VISUAL:
 *   1. Al cargar → sensores del celular ya activos (iniciados por ActivityManager)
 *   2. Botón "Conectar wearable" → intenta Bluetooth
 *      - Éxito: muestra estado BLE + datos de HR
 *      - Fallo: muestra aviso + formulario manual visible
 *   3. Formulario manual siempre accesible (no bloqueado por el estado BLE)
 *   4. Panel de estado muestra qué fuente está activa en tiempo real
 *
 * Este módulo NO modifica el DOM directamente en el HTML; en su lugar
 * recibe un elemento contenedor y lo puebla, para que sea fácil de
 * reubicar dentro del dashboard completo.
 */

import {
  initActivityManager,
  tryConnectBluetooth,
  onActivityUpdate,
  getTodayRecord,
} from '../modules/activity-manager.js';

import { submitManualEntry } from '../modules/manual-tracker.js';
import { isBluetoothAvailable } from '../modules/bluetooth-tracker.js';
import { isMotionAvailable } from '../modules/motion-tracker.js';

// ─── Punto de entrada ─────────────────────────────────────────────────────────

/**
 * Monta el panel de actividad dentro del elemento contenedor dado.
 * @param {HTMLElement} container
 */
export async function mountActivityPanel(container) {
  container.innerHTML = _renderShell();
  _bindElements(container);
  _updateSourceBadges();

  // Inicializar manager (arranca sensores del celular automáticamente)
  const { motionStarted } = await initActivityManager();
  _updateMotionBadge(motionStarted);

  // Suscribirse a actualizaciones del registro diario
  onActivityUpdate(_onRecordUpdate);

  // Mostrar registro guardado si ya hay datos de hoy
  _onRecordUpdate(getTodayRecord());
}

// ─── Elementos del DOM (referencias cacheadas) ───────────────────────────────

const _el = {};

function _bindElements(container) {
  _el.btButton     = container.querySelector('#btn-connect-bt');
  _el.btStatus     = container.querySelector('#bt-status');
  _el.motionBadge  = container.querySelector('#badge-motion');
  _el.btBadge      = container.querySelector('#badge-bt');
  _el.manualBadge  = container.querySelector('#badge-manual');
  _el.minutesValue = container.querySelector('#minutes-value');
  _el.sourceLabel  = container.querySelector('#source-label');
  _el.manualForm   = container.querySelector('#manual-form');
  _el.manualInput  = container.querySelector('#manual-input');
  _el.manualType   = container.querySelector('#manual-type');
  _el.manualSubmit = container.querySelector('#btn-manual-submit');
  _el.manualError  = container.querySelector('#manual-error');
  _el.manualSuccess= container.querySelector('#manual-success');

  // Ocultar botón BLE si el navegador no lo soporta
  if (!isBluetoothAvailable()) {
    _el.btButton.disabled = true;
    _el.btButton.title = 'Web Bluetooth no disponible en este navegador';
    _el.btBadge.classList.add('badge--unavailable');
    _el.btBadge.textContent = '⬤ Bluetooth no disponible';
  }

  _el.btButton.addEventListener('click', _onConnectBluetooth);
  _el.manualSubmit.addEventListener('click', _onManualSubmit);
  _el.manualInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') _onManualSubmit();
  });
}

// ─── Handlers de eventos ──────────────────────────────────────────────────────

async function _onConnectBluetooth() {
  _el.btButton.disabled = true;
  _el.btButton.textContent = 'Buscando…';
  _el.btStatus.textContent = 'Buscando dispositivo BLE…';
  _el.btStatus.className = 'status-msg status-msg--info';

  const connected = await tryConnectBluetooth();

  if (connected) {
    _el.btStatus.textContent = '✓ Wearable conectado';
    _el.btStatus.className = 'status-msg status-msg--success';
    _el.btBadge.textContent = '⬤ Bluetooth activo';
    _el.btBadge.classList.remove('badge--inactive', 'badge--unavailable');
    _el.btBadge.classList.add('badge--active');
    _el.btButton.textContent = 'Reconectar wearable';
  } else {
    _el.btStatus.textContent =
      'No se encontró wearable compatible. Usando sensores del celular + entrada manual.';
    _el.btStatus.className = 'status-msg status-msg--warn';
    // Resaltar el formulario manual para guiar al usuario
    _el.manualForm.classList.add('manual-form--highlighted');
  }

  _el.btButton.disabled = false;
}

function _onManualSubmit() {
  const type  = _el.manualType.value;   // 'steps' | 'activeMinutes'
  const value = parseFloat(_el.manualInput.value);

  _el.manualError.textContent   = '';
  _el.manualSuccess.textContent = '';

  const result = submitManualEntry(type, value);

  if (!result.ok) {
    _el.manualError.textContent = result.error;
    return;
  }

  _el.manualSuccess.textContent =
    `Guardado: ${result.activeMinutes} minutos activos registrados.`;
  _el.manualInput.value = '';
  _el.manualBadge.textContent = '⬤ Manual activo';
  _el.manualBadge.classList.remove('badge--inactive');
  _el.manualBadge.classList.add('badge--active');
}

// ─── Actualización de la UI con datos reales ──────────────────────────────────

/**
 * Recibe el DailyRecord actualizado y refresca los valores visibles.
 * @param {object} record
 */
function _onRecordUpdate(record) {
  if (!record || !_el.minutesValue) return;

  _el.minutesValue.textContent = record.activeMinutes;

  const sourceLabels = {
    bluetooth: '📡 Wearable (Bluetooth)',
    motion:    '📱 Sensores del celular',
    manual:    '✏️ Entrada manual',
    none:      '— Sin datos todavía',
  };
  _el.sourceLabel.textContent = sourceLabels[record.primarySource] ?? '—';

  // Resaltar badge de fuente activa
  _highlightSourceBadge(record.primarySource);
}

function _updateMotionBadge(started) {
  if (!_el.motionBadge) return;
  if (started) {
    _el.motionBadge.textContent = '⬤ Sensores del celular activos';
    _el.motionBadge.classList.remove('badge--inactive');
    _el.motionBadge.classList.add('badge--active');
  } else {
    _el.motionBadge.textContent = '⬤ Sensores del celular no disponibles';
    _el.motionBadge.classList.add('badge--unavailable');
  }
}

function _updateSourceBadges() {
  if (!isMotionAvailable() && _el.motionBadge) {
    _el.motionBadge.classList.add('badge--unavailable');
  }
}

function _highlightSourceBadge(source) {
  [_el.btBadge, _el.motionBadge, _el.manualBadge].forEach((b) => {
    if (b) b.classList.remove('badge--primary');
  });
  const map = {
    bluetooth: _el.btBadge,
    motion:    _el.motionBadge,
    manual:    _el.manualBadge,
  };
  if (map[source]) map[source].classList.add('badge--primary');
}

// ─── Plantilla HTML del panel ─────────────────────────────────────────────────

function _renderShell() {
  return /* html */`
<section class="activity-panel" aria-label="Panel de captura de actividad">

  <h2 class="panel-title">Actividad de hoy</h2>

  <!-- Resumen principal -->
  <div class="activity-summary" aria-live="polite">
    <span class="minutes-value" id="minutes-value" aria-label="Minutos activos">0</span>
    <span class="minutes-label">minutos activos</span>
    <p class="source-label" id="source-label">— Sin datos todavía</p>
  </div>

  <!-- Estado de fuentes -->
  <div class="sources-status" role="status">
    <span class="badge badge--inactive" id="badge-bt">⬤ Bluetooth inactivo</span>
    <span class="badge badge--inactive" id="badge-motion">⬤ Sensores del celular iniciando…</span>
    <span class="badge badge--inactive" id="badge-manual">⬤ Manual sin datos</span>
  </div>

  <!-- Conexión Bluetooth -->
  <div class="bt-section">
    <button id="btn-connect-bt" class="btn btn--primary" type="button">
      Conectar wearable (Bluetooth)
    </button>
    <p id="bt-status" class="status-msg" aria-live="polite"></p>
  </div>

  <!-- Captura manual -->
  <div id="manual-form" class="manual-form">
    <h3 class="manual-form__title">Ingresar manualmente</h3>
    <p class="manual-form__hint">
      Consulta la app de tu wearable (ej. Huawei Health, Fitbit) e ingresa el dato aquí.
    </p>
    <div class="manual-form__row">
      <select id="manual-type" class="input input--select" aria-label="Tipo de dato">
        <option value="steps">Pasos</option>
        <option value="activeMinutes">Minutos activos</option>
      </select>
      <input
        id="manual-input"
        class="input input--number"
        type="number"
        min="0"
        placeholder="Ej. 8000"
        aria-label="Valor"
      />
      <button id="btn-manual-submit" class="btn btn--secondary" type="button">
        Guardar
      </button>
    </div>
    <p id="manual-error"   class="msg msg--error"   role="alert" aria-live="assertive"></p>
    <p id="manual-success" class="msg msg--success"  aria-live="polite"></p>
  </div>

</section>
  `.trim();
}
