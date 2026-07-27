# Implementation Plan: ui-result-components

## Overview

Correcciones de CSS, media queries responsive y guardas JS defensivas para que las cinco secciones funcionales de la Vista de Resultado (`#view-result`) se rendericen correctamente en dispositivos móviles (≤ 480px). El trabajo se divide en: estilos base para el panel montado dinámicamente, reglas responsive para móvil, y guardas defensivas en JS para evitar fallos silenciosos de montaje.

## Tasks

- [x] 1. Agregar estilos CSS base para el panel de actividad montado dinámicamente
  - [x] 1.1 Agregar estilos para `.activity-panel`, `.panel-title`, `.activity-summary`, `.minutes-value`, `.minutes-label`, `.source-label` en `src/ui/styles.css`
    - Definir `.activity-panel` con background `var(--color-card)`, border `1px solid var(--color-border)`, border-radius `var(--radius-lg)`, padding `1.5rem`
    - Definir `.panel-title` con font-size, font-weight 700
    - Definir `.activity-summary` como flex column centrado con gap
    - Definir `.minutes-value` con font-size 2rem+, font-weight 800, color accent
    - Definir `.minutes-label` y `.source-label` con font-size small y color muted
    - _Requirements: 6.1, 6.3_

  - [x] 1.2 Agregar estilos para `.sources-status` y badges (`.badge`, `.badge--active`, `.badge--inactive`, `.badge--unavailable`, `.badge--primary`) en `src/ui/styles.css`
    - `.sources-status` como flex con wrap y gap
    - `.badge` como inline-flex, pill shape (border-radius 999px), font-size small, padding
    - `.badge--active` con color `var(--color-success)`
    - `.badge--inactive` con color `var(--color-muted)`
    - `.badge--unavailable` con color `var(--color-danger)`
    - `.badge--primary` con ring/highlight usando `var(--color-accent)`
    - _Requirements: 6.1, 6.4_

  - [x] 1.3 Agregar estilos para `.bt-section`, `.status-msg` y variantes en `src/ui/styles.css`
    - `.bt-section` como flex column con gap
    - `.status-msg` con font-size small
    - `.status-msg--info` con color accent, `.status-msg--success` con color success, `.status-msg--warn` con color warn
    - _Requirements: 6.1, 3.2_

  - [x] 1.4 Agregar estilos para `.manual-form`, `.manual-form__title`, `.manual-form__hint`, `.manual-form__row`, `.manual-form--highlighted` en `src/ui/styles.css`
    - `.manual-form` como card interior con padding y gap
    - `.manual-form__title` con font-size y font-weight
    - `.manual-form__hint` con font-size small y color muted
    - `.manual-form__row` como flex row con gap (row por defecto para desktop)
    - `.manual-form--highlighted` con border color accent
    - _Requirements: 6.1, 6.2, 4.1_

  - [x] 1.5 Agregar estilos para `.input`, `.input--select`, `.input--number`, `.btn--secondary`, `.msg`, `.msg--error`, `.msg--success` en `src/ui/styles.css`
    - `.input` con min-height 44px, padding, border, border-radius, background surface
    - `.input--select` con appearance none y custom styling
    - `.input--number` con width flexible (flex: 1)
    - `.btn--secondary` con background surface, border accent, color accent
    - `.msg` con font-size small, `.msg--error` color danger, `.msg--success` color success
    - _Requirements: 6.1, 4.1, 4.4_

- [x] 2. Agregar media query responsive (≤ 480px) para la vista de resultado
  - [x] 2.1 Agregar bloque `@media (max-width: 480px)` con reglas para el panel de actividad en `src/ui/styles.css`
    - `.manual-form__row`: flex-direction column para apilar select, input y botón verticalmente
    - `.activity-panel`: padding reducido (1rem) para aprovechar ancho
    - `.sources-status`: flex-wrap wrap asegurado
    - Todos los botones, inputs y áreas interactivas: min-height 44px
    - _Requirements: 6.2, 4.4, 3.3_

  - [x] 2.2 Agregar reglas responsive para `.result-message` y `.recommendations-section` en el mismo media query
    - `.result-message`: word-wrap break-word, overflow-wrap break-word, width 100%
    - `.recommendations-section`: padding lateral ajustado
    - `.recommendation-item__check`: min-width y min-height 44px para touch targets
    - _Requirements: 1.3, 5.4_

- [x] 3. Checkpoint — Verificar estilos en DevTools mobile mode
  - Ensure all tests pass, ask the user if questions arise.
  - Abrir Chrome DevTools → Device Mode → 375×667 (iPhone SE)
  - Verificar que no hay overflow-x en `<body>`, badges visibles, formulario manual apilado verticalmente

- [x] 4. Agregar guardas defensivas en `src/ui/app.js`
  - [x] 4.1 Agregar guard en `renderResult()` para crear `#result-message` si no existe en el DOM
    - Verificar que `document.getElementById('result-message')` no es null
    - Si es null, crear un elemento `<p>` con clase `result-message`, id `result-message`, y atributo `aria-live="polite"`
    - Insertarlo antes de `.activity-section` dentro del container
    - _Requirements: 1.4_

  - [x] 4.2 Envolver la llamada a `mountActivityPanel()` en try/catch dentro de `initApp()`
    - Capturar excepciones y hacer `console.error('[ActivityPanel] Mount failed:', error)` sin bloquear el resto de la inicialización
    - _Requirements: 3.4_

  - [x] 4.3 Agregar guard en `_renderRecommendations()` para verificar existencia de `#recommendations-list`
    - Si `listEl` es null, retornar sin operar (ya está implementado, verificar que la función no falla si el contenedor no existe)
    - Si nivel es 'low' o array vacío y el contenedor existe, asegurar que muestra el mensaje de nivel adecuado (no dejar invisible)
    - _Requirements: 5.5_

- [x] 5. Agregar guardas defensivas en `src/ui/activity-panel.js`
  - [x] 5.1 Agregar null check en `mountActivityPanel()` para verificar que `container` no es null
    - Si container es null o undefined, hacer `console.error('[ActivityPanel] Container not found')` y retornar sin operar
    - _Requirements: 3.4_

  - [x] 5.2 Agregar null checks en `_bindElements()` antes de `addEventListener`
    - Verificar que `_el.btButton`, `_el.manualSubmit`, y `_el.manualInput` no son null antes de agregar event listeners
    - Envolver cada addEventListener en un check condicional
    - _Requirements: 3.4_

- [x] 6. Checkpoint — Verificar funcionalidad completa en móvil
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar en Chrome DevTools mobile mode que las 5 secciones son visibles
  - Verificar que no hay errores en consola al montar el panel
  - Verificar que el formulario manual es usable (inputs tocables, sin scroll horizontal)

- [ ]* 7. Agregar tests unitarios example-based
  - [ ]* 7.1 Configurar Vitest como framework de testing en el proyecto
    - Instalar vitest como devDependency
    - Agregar script `"test": "vitest --run"` en package.json
    - Configurar vitest en vite.config.js con environment jsdom
    - _Requirements: N/A (infraestructura de testing)_

  - [ ]* 7.2 Escribir tests unitarios para `renderResult()` y `buildContextMessage()`
    - Test: dado level='high', `buildContextMessage` retorna string con valores numéricos de fuerza y VO2
    - Test: dado level='low', retorna string sin valores numéricos de déficit
    - Test: dado level='medium', incluye `deficitMinutes` en el texto
    - _Requirements: 1.1, 1.2_

  - [ ]* 7.3 Escribir tests unitarios para `mountActivityPanel()` en activity-panel.js
    - Test: dado un container válido (div en jsdom), verifica que `.activity-panel` existe como child tras mount
    - Test: dado null como container, verifica que no lanza excepción y hace console.error
    - _Requirements: 3.1, 3.4_

  - [ ]* 7.4 Escribir tests unitarios para `_renderRecommendations()`
    - Test: dado level='medium', genera ≤ 3 items en `#recommendations-list`
    - Test: dado level='low', muestra mensaje de nivel adecuado
    - Test: dado array vacío de recomendaciones, muestra mensaje de nivel adecuado en lugar de contenedor vacío
    - _Requirements: 5.1, 5.2, 5.5_

- [x] 8. Final checkpoint — Verificación completa
  - Ensure all tests pass, ask the user if questions arise.
  - Ejecutar `npm test` para validar tests unitarios (si se implementaron)
  - Verificar en DevTools mobile las 5 secciones visibles sin desbordamiento

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- No property-based tests are included because this feature is purely UI/CSS/DOM — no pure functions with variable input/output to validate
- Unit tests validate specific examples of DOM rendering behavior
- El proyecto usa Vite + JavaScript vanilla; los tests opcionales usan Vitest con jsdom
- Las correcciones son defensivas — no cambian la arquitectura de la SPA

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"] },
    { "id": 1, "tasks": ["2.1", "2.2", "4.1", "4.2", "4.3", "5.1", "5.2"] },
    { "id": 2, "tasks": ["7.1"] },
    { "id": 3, "tasks": ["7.2", "7.3", "7.4"] }
  ]
}
```
