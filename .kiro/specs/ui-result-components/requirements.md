# Requirements Document

## Introduction

La vista de resultado (`view-result`) de ValkBit contiene cinco secciones funcionales que actualmente no se renderizan o muestran correctamente en dispositivos móviles vía ngrok. El HTML y los módulos JS existen, pero los componentes no aparecen visualmente. Este spec aborda las correcciones de CSS, inicialización JS y estructura HTML necesarias para que cada sección sea visible y funcional en móvil.

## Glossary

- **Vista_Resultado**: La tercera vista de la SPA (`#view-result`) que muestra el score de riesgo y las secciones de actividad.
- **Mensaje_Contextual**: Sección `#result-message` que muestra un párrafo explicativo del riesgo según el nivel calculado.
- **Panel_Actividad**: Sección `.activity-section` que contiene los controles de sesión (iniciar/finalizar actividad) y el contador de pasos.
- **Panel_Wearable**: Componente montado dinámicamente en `#activity-panel-mount` que ofrece conexión Bluetooth y entrada manual.
- **Entrada_Manual**: Formulario dentro del Panel_Wearable que permite al usuario ingresar pasos o minutos activos consultando la app de su wearable.
- **Sección_Recomendaciones**: Bloque `.recommendations-section` que lista contramedidas de ejercicio marcables según el nivel de riesgo.
- **Viewport_Móvil**: Pantalla de dispositivo con ancho ≤ 480px accedida vía navegador móvil (Chrome Android / Safari iOS).

## Requirements

### Requisito 1: Visibilidad del Mensaje Contextual de Riesgo

**Historia de Usuario:** Como usuario, quiero ver un mensaje que explique mi nivel de riesgo en lenguaje claro, para que entienda qué significa mi score y qué proyecciones tiene.

#### Criterios de Aceptación

1. WHEN la Vista_Resultado se muestra tras calcular el score, THE Mensaje_Contextual SHALL renderizar un párrafo visible con texto descriptivo según el nivel de riesgo (low, medium, high).
2. WHEN el nivel de riesgo es "medium" o "high", THE Mensaje_Contextual SHALL incluir valores numéricos de déficit de minutos y proyecciones de pérdida de fuerza y VO₂peak.
3. WHILE el Viewport_Móvil tiene ancho ≤ 480px, THE Mensaje_Contextual SHALL ocupar el ancho completo del contenedor sin desbordamiento horizontal ni texto cortado.
4. IF el elemento `#result-message` no existe en el DOM, THEN THE Vista_Resultado SHALL crear el elemento antes de inyectar el contenido HTML del mensaje.

### Requisito 2: Visibilidad de la Sección "Actividad de hoy"

**Historia de Usuario:** Como usuario, quiero ver la sección de actividad diaria con sus controles de sesión (iniciar/finalizar), para que pueda registrar mi movimiento en tiempo real.

#### Criterios de Aceptación

1. WHEN la Vista_Resultado se muestra, THE Panel_Actividad SHALL ser visible con su título "Actividad de hoy", el contador de pasos y el botón "Iniciar actividad".
2. WHILE no hay sesión activa, THE Panel_Actividad SHALL mostrar el estado `session-idle` con el botón de inicio habilitado y los estados `session-active` y `session-saved` ocultos.
3. WHEN el usuario presiona "Iniciar actividad", THE Panel_Actividad SHALL solicitar permisos del sensor y transicionar al estado `session-active` mostrando datos en tiempo real (pasos y minutos activos).
4. WHILE el Viewport_Móvil tiene ancho ≤ 480px, THE Panel_Actividad SHALL renderizar los elementos de sesión en tiempo real con números legibles (font-size mínimo de 1.4rem para los contadores).
5. IF el sensor de movimiento no está disponible, THEN THE Panel_Actividad SHALL mostrar un panel de diagnóstico con el estado de cada requisito técnico (HTTPS, DeviceMotionEvent, recepción de datos).

### Requisito 3: Visibilidad del Panel de Conexión Wearable (Bluetooth)

**Historia de Usuario:** Como usuario, quiero ver el panel de conexión Bluetooth para conectar un wearable, para que pueda complementar la captura de actividad con datos de frecuencia cardíaca.

#### Criterios de Aceptación

1. WHEN la Vista_Resultado se muestra, THE Panel_Wearable SHALL montarse dinámicamente dentro del contenedor `#activity-panel-mount` con el título "Actividad de hoy", los badges de estado de fuentes y el botón "Conectar wearable (Bluetooth)".
2. WHILE Web Bluetooth no está disponible en el navegador, THE Panel_Wearable SHALL deshabilitar el botón de conexión y mostrar el badge de Bluetooth con estado "no disponible".
3. WHILE el Viewport_Móvil tiene ancho ≤ 480px, THE Panel_Wearable SHALL renderizar todos los badges de estado, el botón de Bluetooth y el formulario manual sin superposición ni desbordamiento.
4. IF el montaje dinámico de `mountActivityPanel` falla por un contenedor inexistente, THEN THE Vista_Resultado SHALL registrar un error en consola sin bloquear el renderizado de las demás secciones.

### Requisito 4: Visibilidad del Formulario de Entrada Manual

**Historia de Usuario:** Como usuario, quiero ver un formulario para ingresar manualmente mis pasos o minutos activos, para que pueda registrar actividad aunque los sensores automáticos no funcionen.

#### Criterios de Aceptación

1. WHEN el Panel_Wearable se monta, THE Entrada_Manual SHALL ser visible con el título "Ingresar manualmente", un selector de tipo (Pasos / Minutos activos), un campo numérico y un botón "Guardar".
2. WHEN el usuario ingresa un valor válido y presiona "Guardar", THE Entrada_Manual SHALL mostrar un mensaje de éxito con los minutos activos registrados y limpiar el campo de entrada.
3. IF el usuario ingresa un valor inválido (negativo, vacío, no numérico), THEN THE Entrada_Manual SHALL mostrar un mensaje de error descriptivo sin perder el valor ingresado.
4. WHILE el Viewport_Móvil tiene ancho ≤ 480px, THE Entrada_Manual SHALL renderizar el selector, input y botón en un layout que no requiera scroll horizontal, con el campo de entrada de ancho suficiente para tocar cómodamente (min-height de 44px en áreas interactivas).

### Requisito 5: Visibilidad de la Sección de Contramedidas Recomendadas

**Historia de Usuario:** Como usuario, quiero ver una lista de ejercicios recomendados que pueda marcar como completados, para que mis minutos de actividad se sumen al score del día.

#### Criterios de Aceptación

1. WHEN la Vista_Resultado se muestra con nivel de riesgo "medium" o "high", THE Sección_Recomendaciones SHALL renderizar hasta 3 recomendaciones con texto descriptivo, minutos equivalentes y fuente científica.
2. WHEN la Vista_Resultado se muestra con nivel de riesgo "low", THE Sección_Recomendaciones SHALL mostrar un mensaje indicando que el nivel de actividad es adecuado, sin listar ejercicios.
3. WHEN el usuario marca una recomendación como completada, THE Sección_Recomendaciones SHALL actualizar visualmente el item (estilo tachado/completado) y recalcular el score sumando los minutos bonus.
4. WHILE el Viewport_Móvil tiene ancho ≤ 480px, THE Sección_Recomendaciones SHALL renderizar cada item con áreas de toque de al menos 44×44px y texto legible sin truncamiento.
5. IF la función `getRecommendations` retorna un array vacío, THEN THE Sección_Recomendaciones SHALL mostrar el contenedor visible con el mensaje de nivel adecuado en lugar de un contenedor vacío invisible.

### Requisito 6: Estilos CSS para el Panel de Actividad Montado Dinámicamente

**Historia de Usuario:** Como desarrollador, quiero que los estilos del panel de actividad (Bluetooth + entrada manual) estén definidos en styles.css, para que el componente montado dinámicamente tenga una apariencia consistente con el resto de la app.

#### Criterios de Aceptación

1. THE Vista_Resultado SHALL aplicar estilos definidos en `styles.css` a todas las clases generadas por `activity-panel.js`: `.activity-panel`, `.activity-summary`, `.sources-status`, `.badge`, `.bt-section`, `.manual-form`, `.manual-form__row`.
2. WHILE el Viewport_Móvil tiene ancho ≤ 480px, THE Vista_Resultado SHALL aplicar reglas responsive que ajusten `.manual-form__row` a layout vertical (flex-direction: column) para evitar desbordamiento.
3. WHEN el Panel_Wearable se monta, THE Vista_Resultado SHALL mostrar el componente con el mismo esquema de colores (--color-card, --color-border, --color-accent) y border-radius que las demás tarjetas de la vista.
4. THE Vista_Resultado SHALL garantizar que los elementos `.badge--active`, `.badge--inactive` y `.badge--unavailable` tengan diferenciación visual clara (color distinto por estado).
