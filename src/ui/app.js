/**
 * app.js
 * Orquestador de la SPA de una sola página.
 *
 * VISTAS:
 *   hero        → pantalla de bienvenida
 *   onboarding  → cuestionario de 3 preguntas
 *   result      → score provisional + proyecciones
 *
 * La navegación entre vistas es puro CSS: solo una tiene la clase .active.
 * No hay router, no hay recarga de página.
 */

import {
  validateAnswers,
  calculateProvisionalScore,
  saveOnboarding,
  loadOnboarding,
  hasCompletedOnboarding,
} from '../modules/onboarding.js';

import { seedOnboardingRecord } from '../modules/activity-manager.js';

import {
  beginSession,
  endSession,
  saveSession,
  discardSession,
  resetToIdle,
  onStatusChange,
  onTick,
  getTodaySessions,
  getTodayActiveMinutes,
  prepareMotion,
} from '../modules/session-manager.js';

import { getStepCount, diagnoseSensor } from '../modules/motion-tracker.js';

// ─── Navegación entre vistas ──────────────────────────────────────────────────

/**
 * Activa la vista indicada y desactiva las demás.
 * @param {'hero'|'onboarding'|'result'} name
 */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${name}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ─── Vista: Hero ──────────────────────────────────────────────────────────────

function initHeroView() {
  document.getElementById('btn-start').addEventListener('click', () => {
    showView('onboarding');
  });
}

// ─── Vista: Cuestionario ──────────────────────────────────────────────────────

/** Configura un slider para actualizar su etiqueta de valor en tiempo real. */
function bindSlider(sliderId, displayId, suffix = '') {
  const slider  = document.getElementById(sliderId);
  const display = document.getElementById(displayId);
  if (!slider || !display) return;

  const update = () => { display.textContent = slider.value + suffix; };
  slider.addEventListener('input', update);
  update(); // valor inicial
}

function initOnboardingView() {
  bindSlider('q-seated',   'val-seated',   ' h');
  bindSlider('q-days',     'val-days',     ' días');
  bindSlider('q-minutes',  'val-minutes',  ' min');

  document.getElementById('btn-calculate').addEventListener('click', () => {
    const answers = {
      hoursSeated:     Number(document.getElementById('q-seated').value),
      exerciseDays:    Number(document.getElementById('q-days').value),
      exerciseMinutes: Number(document.getElementById('q-minutes').value),
    };

    const validation = validateAnswers(answers);
    const errorEl = document.getElementById('form-error');

    if (!validation.ok) {
      errorEl.textContent = validation.errors[0];
      return;
    }
    errorEl.textContent = '';

    const result = calculateProvisionalScore(answers);
    saveOnboarding(answers, result);

    // Sembrar el registro provisional en el activity-manager
    // para que el motor de riesgo tenga una base desde el día 1
    seedOnboardingRecord(result.activeMinutesPerDay);

    renderResult(result);
    showView('result');
  });

  document.getElementById('btn-back-hero')?.addEventListener('click', () => {
    showView('hero');
  });
}

// ─── Vista: Resultado ─────────────────────────────────────────────────────────

/**
 * Dibuja el gauge SVG animado.
 * El gauge muestra score 0-100 sobre un arco de 75% del círculo.
 */
function animateGauge(score, level) {
  const fill    = document.getElementById('gauge-fill');
  const scoreEl = document.getElementById('gauge-score');
  if (!fill || !scoreEl) return;

  const R           = 80; // radio del arco (viewBox 180×180, centro 90,90)
  const circumference = 2 * Math.PI * R;
  const arcFraction  = 0.75; // usamos el 75% del círculo
  const arcLength    = circumference * arcFraction;

  fill.setAttribute('stroke-dasharray', `${arcLength} ${circumference}`);

  // Empezar desde el arco completo (sin progreso) y animar a la posición del score
  const offset = arcLength - (score / 100) * arcLength;
  fill.setAttribute('stroke-dashoffset', arcLength); // posición inicial

  const colorMap = {
    low:    'var(--color-success)',
    medium: 'var(--color-warn)',
    high:   'var(--color-danger)',
  };
  fill.setAttribute('stroke', colorMap[level] ?? 'var(--color-accent)');

  // Animar: doble rAF para asegurar que el navegador registró el estado inicial
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.setAttribute('stroke-dashoffset', offset);
    });
  });

  // Animar el número del score
  let current = 0;
  const step  = Math.ceil(score / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, score);
    scoreEl.textContent = current;
    if (current >= score) clearInterval(timer);
  }, 30);
}

/**
 * Genera el mensaje contextual según el nivel de riesgo.
 * @param {{ level, deficitMinutes, projectedStrengthLoss30d, projectedVO2Loss30d }} result
 */
function buildContextMessage(result) {
  const { level, deficitMinutes, projectedStrengthLoss30d, projectedVO2Loss30d } = result;

  if (level === 'low') {
    return `Tu nivel de actividad es <strong>adecuado</strong>. Mantenerlo te protege del deterioro muscular y cardiovascular que documentan los estudios de la NASA en condiciones de inactividad prolongada.`;
  }
  if (level === 'medium') {
    return `Con tu rutina actual te faltan <strong>${deficitMinutes} min activos por día</strong> para alcanzar el mínimo de salud. En 30 días sin cambios, los modelos NASA estiman una pérdida de fuerza de hasta <strong>${projectedStrengthLoss30d}%</strong> y una caída de capacidad aeróbica de <strong>${projectedVO2Loss30d}%</strong>.`;
  }
  // high
  return `Tu nivel de sedentarismo es <strong>alto</strong>. Los estudios de bed-rest de la NASA muestran que la inactividad prolongada sin contramedida puede costar hasta <strong>${projectedStrengthLoss30d}% de fuerza</strong> y <strong>${projectedVO2Loss30d}% de VO₂peak</strong> en solo 30 días. Empezar con 30 min/día de movimiento marca una diferencia real.`;
}

/**
 * Rellena la vista de resultado con los datos calculados.
 * @param {object} result - Resultado de calculateProvisionalScore()
 */
function renderResult(result) {
  const { score, level, label, activeMinutesPerDay, deficitMinutes,
          projectedStrengthLoss30d, projectedVO2Loss30d } = result;

  // Gauge
  animateGauge(score, level);

  // Color del score
  const colorMap = {
    low:    'var(--color-success)',
    medium: 'var(--color-warn)',
    high:   'var(--color-danger)',
  };
  const scoreEl = document.getElementById('gauge-score');
  if (scoreEl) scoreEl.style.color = colorMap[level];

  // Badge de nivel
  const badge = document.getElementById('risk-badge');
  if (badge) {
    badge.textContent = label;
    badge.className   = `risk-badge risk-badge--${level}`;
  }

  // Tarjetas de detalle
  _setText('detail-active-min',    `${activeMinutesPerDay} min`);
  _setText('detail-deficit',       deficitMinutes > 0 ? `−${deficitMinutes} min` : '✓ Cubierto');
  _setText('detail-strength-loss', `−${projectedStrengthLoss30d}%`);
  _setText('detail-vo2-loss',      `−${projectedVO2Loss30d}%`);

  // Colorear déficit
  const defEl = document.getElementById('detail-deficit');
  if (defEl) {
    defEl.style.color = deficitMinutes > 0
      ? 'var(--color-danger)'
      : 'var(--color-success)';
  }

  // Mensaje contextual
  const msgEl = document.getElementById('result-message');
  if (msgEl) msgEl.innerHTML = buildContextMessage(result);

  // Botón de reinicio
  document.getElementById('btn-redo')?.addEventListener('click', () => {
    showView('onboarding');
  }, { once: true });
}

/** @private */
function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ─── Sección de actividad del día ─────────────────────────────────────────────

/**
 * Formatea milisegundos a "m:ss".
 * @param {number} ms
 * @returns {string}
 */
function _formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Muestra solo uno de los tres bloques de estado de sesión.
 * @param {'idle'|'active'|'saved'} state
 */
function _showSessionState(state) {
  ['idle', 'active', 'saved'].forEach(s => {
    const el = document.getElementById(`session-${s}`);
    if (el) el.hidden = (s !== state);
  });
}

/**
 * Recalcula el score con los minutos activos reales del día y
 * actualiza el gauge + badge sin reanimar desde 0.
 * @param {number} realActiveMinutes
 */
function _refreshScoreFromActivity(realActiveMinutes) {
  const saved = loadOnboarding();
  if (!saved?.answers) return;

  // Recalcular con los minutos reales acumulados hoy
  const updatedAnswers = {
    ...saved.answers,
    // Sustituir la estimación por los minutos reales del día
    exerciseDays:    7,
    exerciseMinutes: realActiveMinutes,
  };
  const newResult = calculateProvisionalScore(updatedAnswers);

  // Actualizar gauge (sin animación de entrada, solo el offset)
  const R             = 80;
  const circumference = 2 * Math.PI * R;
  const arcLength     = circumference * 0.75;
  const offset        = arcLength - (newResult.score / 100) * arcLength;
  const fill          = document.getElementById('gauge-fill');
  const scoreEl       = document.getElementById('gauge-score');

  if (fill) {
    fill.setAttribute('stroke-dashoffset', offset);
    const colorMap = { low: 'var(--color-success)', medium: 'var(--color-warn)', high: 'var(--color-danger)' };
    fill.setAttribute('stroke', colorMap[newResult.level]);
  }
  if (scoreEl) {
    scoreEl.textContent  = newResult.score;
    const colorMap = { low: 'var(--color-success)', medium: 'var(--color-warn)', high: 'var(--color-danger)' };
    scoreEl.style.color  = colorMap[newResult.level];
  }

  const badge = document.getElementById('risk-badge');
  if (badge) {
    badge.textContent = newResult.label;
    badge.className   = `risk-badge risk-badge--${newResult.level}`;
  }

  // Actualizar tarjeta de minutos activos
  _setText('detail-active-min', `${realActiveMinutes} min`);

  // Actualizar nota provisional: ya tiene datos reales
  const note = document.querySelector('.provisional-note span:last-child');
  if (note) {
    note.innerHTML = `Score actualizado con <strong>${realActiveMinutes} min activos</strong> registrados hoy.`;
  }
}

/**
 * Renderiza el historial de sesiones del día en el estado idle.
 */
function _renderSessionHistory() {
  const historyEl = document.getElementById('session-history');
  if (!historyEl) return;

  const sessions = getTodaySessions();
  if (sessions.length === 0) {
    historyEl.hidden = true;
    return;
  }

  historyEl.hidden = false;
  historyEl.innerHTML = `
    <p class="session-history__title">Sesiones de hoy</p>
    ${sessions.map((s, i) => {
      const time = new Date(s.startTime).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="session-history__item">
          <span>Sesión ${i + 1} · ${time}</span>
          <span class="session-history__item-steps">${s.steps} pasos · ${s.activeMinutes} min</span>
        </div>`;
    }).join('')}
  `;
}

/** Ticker que actualiza los pasos del día completo cada 5 s */
let _stepsTicker = null;

function _startStepsTicker() {
  if (_stepsTicker) return;
  _stepsTicker = setInterval(() => {
    const el = document.getElementById('steps-today-count');
    if (el) el.textContent = getStepCount();
  }, 5_000);
}

/**
 * Muestra el panel de diagnóstico del sensor con el resultado de diagnoseSensor().
 * @param {object} diag
 */
function _showSensorDiag(diag) {
  const panel = document.getElementById('sensor-diag');
  const list  = document.getElementById('sensor-diag-list');
  if (!panel || !list) return;

  const items = [
    {
      ok: diag.isHttps,
      label: diag.isHttps ? 'HTTPS ✓' : 'HTTPS ✗ — los sensores requieren HTTPS o localhost',
    },
    {
      ok: diag.available,
      label: diag.available ? 'DeviceMotionEvent disponible ✓' : 'DeviceMotionEvent no disponible en este navegador ✗',
    },
    {
      ok: diag.receivingData,
      label: diag.receivingData ? 'Sensor recibiendo datos ✓' : 'Sensor no envía eventos ✗',
    },
    ...(diag.receivingData && diag.accelerationNull ? [{
      ok: false,
      warn: true,
      label: 'Valores de aceleración son null — hardware bloqueado por el sistema ⚠',
    }] : []),
    { ok: null, label: diag.detail },
  ];

  list.innerHTML = items.map(item => {
    const cls = item.ok === null ? '' : item.warn ? 'sensor-diag__item--warn' : item.ok ? 'sensor-diag__item--ok' : 'sensor-diag__item--error';
    const icon = item.ok === null ? 'ℹ' : item.warn ? '⚠' : item.ok ? '✓' : '✗';
    return `<li class="sensor-diag__item ${cls}"><span>${icon}</span><span>${item.label}</span></li>`;
  }).join('');

  panel.hidden = false;
}

/**
 * Inicializa los botones y callbacks de la sección de sesión.
 */
function initSessionSection() {
  // Suscribir callbacks del session-manager
  onStatusChange(({ status, session }) => {
    _showSessionState(status);

    if (status === 'saved' && session) {
      // Rellenar resumen
      _setText('summary-steps',    session.steps);
      _setText('summary-minutes',  session.activeMinutes);
      _setText('summary-duration', _formatDuration(session.durationMs));
    }

    if (status === 'idle') {
      _renderSessionHistory();
    }
  });

  onTick(({ steps, activeMinutes }) => {
    _setText('live-steps',   steps);
    _setText('live-minutes', activeMinutes);
    // También actualizar pasos totales del día
    const el = document.getElementById('steps-today-count');
    if (el) el.textContent = getStepCount();
  });

  // Botón: Iniciar
  // IMPORTANTE: requestPermissionAndStart() debe ser la PRIMERA await
  // en el handler para que iOS reconozca el gesto del usuario.
  document.getElementById('btn-session-start')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-session-start');
    const hint = document.querySelector('#session-idle .session-state__hint');

    btn.disabled = true;
    btn.textContent = 'Solicitando permiso…';

    // 1. Pedir permiso del sensor DIRECTO en el primer await del gesto
    const ready = await prepareMotion();

    if (!ready) {
      btn.disabled = false;
      btn.textContent = '▶ Iniciar actividad';
      if (hint) hint.textContent = '⚠ No se pudo acceder al sensor. Revisando diagnóstico…';

      // Mostrar diagnóstico detallado
      const diag = await diagnoseSensor();
      _showSensorDiag(diag);

      if (!diag.isHttps) {
        if (hint) hint.textContent = '⚠ La app debe abrirse por HTTPS para acceder al sensor de movimiento.';
      } else if (!diag.available) {
        if (hint) hint.textContent = '⚠ Tu navegador no soporta el sensor de movimiento. Prueba Chrome en Android o Safari en iOS.';
      } else if (!diag.receivingData) {
        if (hint) hint.textContent = '⚠ El sensor no envía datos. En Chrome Android: ve a Ajustes → Privacidad → Permisos del sitio → Sensores de movimiento.';
      }
      return;
    }

    btn.textContent = 'Iniciando…';

    // 2. Con el sensor ya activo, arrancar la sesión
    const ok = await beginSession();
    if (!ok) {
      btn.disabled = false;
      btn.textContent = '▶ Iniciar actividad';
      if (hint) hint.textContent = '⚠ No se pudo iniciar la sesión. Intenta de nuevo.';
      return;
    }
    // Si ok=true, onStatusChange manejará el cambio visual
  });

  // Botón: Finalizar
  document.getElementById('btn-session-stop')?.addEventListener('click', () => {
    endSession(); // onStatusChange → estado 'saved'
  });

  // Botón: Guardar
  document.getElementById('btn-session-save')?.addEventListener('click', () => {
    saveSession();
    const totalMin = getTodayActiveMinutes();
    _refreshScoreFromActivity(totalMin);
    resetToIdle(); // onStatusChange → estado 'idle'
  });

  // Botón: Descartar
  document.getElementById('btn-session-discard')?.addEventListener('click', () => {
    discardSession(); // onStatusChange → estado 'idle'
  });

  // Mostrar historial si ya hay sesiones hoy
  _renderSessionHistory();

  // Iniciar ticker de pasos del día
  _startStepsTicker();
}

// ─── Inicialización ───────────────────────────────────────────────────────────

export function initApp() {
  initHeroView();
  initOnboardingView();
  initSessionSection();

  // Si el usuario ya completó el onboarding en otra sesión, saltar directo al resultado
  if (hasCompletedOnboarding()) {
    const saved = loadOnboarding();
    if (saved?.scoreResult) {
      renderResult(saved.scoreResult);
      // Si ya hay minutos activos reales hoy, refrescar el score
      const todayMin = getTodayActiveMinutes();
      if (todayMin > 0) _refreshScoreFromActivity(todayMin);
      showView('result');
      return;
    }
  }

  showView('hero');
}
