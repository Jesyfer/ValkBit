# Diseño técnico: Contramedida

## Arquitectura general
Aplicación 100% cliente (sin backend obligatorio para el MVP), corriendo en el navegador.

```
[Sensor de movimiento] → [motion-tracker.js] → [risk-engine.js] ←→ [reference-curves.json]
                                                        ↓
                                          [recommendations.js]
                                                        ↓
                                          [visualization.js] → [Usuario]
```

## Componentes

### 1. Captura de datos (`motion-tracker.js`)
Orden real de intentos, validado con pruebas manuales (ver `docs/metricas-extraidas.md` para contexto — probamos conexión directa a un Huawei Band 10 y no expone servicios BLE estándar, así que este es el flujo definitivo):

1. **Intento de conexión Bluetooth genérico**: `navigator.bluetooth.requestDevice()` filtrando por servicios BLE estándar (`heart_rate`, etc.) — funciona con cualquier wearable que exponga el servicio abiertamente (algunos Polar, Garmin, bandas HR genéricas). No asumir que funcionará con una marca específica.
2. **Si no aparece ningún dispositivo o falla la conexión**: mostrar de inmediato un campo de captura manual (el usuario ve sus propios datos en la app de su wearable — ej. Huawei Health — y los teclea). No bloquear el flujo esperando a que el Bluetooth funcione.
3. **En paralelo, si el navegador lo soporta**: `DeviceMotionEvent` del celular como señal complementaria de fondo, con un filtro de patrón rítmico (detectar frecuencia ~1-2 Hz característica de caminar, vía autocorrelación o FFT simple) para no contar como "actividad" el simple manejo del teléfono en la mano.
4. **Onboarding (cold-start)**: si es la primera vez que se usa la app y no hay ninguna de las anteriores, 2-3 preguntas rápidas dan una estimación inicial (ver `requirements.md` Historia 1).

Output combinado: un registro diario de actividad (minutos activos estimados), sin importar de cuál de las tres fuentes haya venido.

### 2. Motor de riesgo (`risk-engine.js`)
- Input: **promedio móvil de los últimos 3-7 días** de actividad registrada (no un solo instante — un instante es demasiado ruidoso para representar el patrón real de la persona). Mientras no haya suficientes días acumulados, usa la estimación del onboarding como base provisional.
- Referencia: `data/reference-curves.json` (ya lleno con datos reales de los NASA HRP Evidence Reports, el RCT de Kramer 2017, y el libro de deconditioning — ver `docs/metricas-extraidas.md`).
- Lógica: la curva de deterioro (pendiente) viene de la ciencia publicada, no se recalcula desde cero con datos personales — el promedio móvil del usuario solo define en qué punto de esa curva arranca.
- Output: score de riesgo (bajo/medio/alto), proyección a 30/60/90 días.

### 3. Motor de recomendaciones (`recommendations.js`)
- Input: score de riesgo actual.
- Lógica basada en reglas (if/else simple, no requiere ML): si el riesgo sube, sugiere ejercicios específicos (protocolo tipo ARED simplificado a movimientos caseros).

### 4. Visualización (`visualization.js`)
- Dashboard tipo "reserva" (barra/medidor que se vacía según el riesgo) — prioriza claridad sobre complejidad visual.
- Muestra la proyección a futuro de forma gráfica (línea de tiempo simple).

## Decisiones pendientes (a resolver en investigación previa, antes de programar `risk-engine.js`)
- [ ] Valores exactos de las curvas de deterioro (% pérdida muscular por día, % pérdida ósea por mes) — de qué papers específicos se sacan, con cita.
- [ ] Fórmula exacta del score de riesgo (cómo se combina actividad real vs. umbral mínimo).
- [ ] Si se usará algún wearable adicional vía Web Bluetooth, o solo el acelerómetro del celular.

## Riesgos técnicos y mitigación
- **Permisos de sensor en iOS Safari**: requiere `DeviceMotionEvent.requestPermission()` explícito, distinto a Android. Probar en dispositivo real el Día 1, no asumir que funciona igual en todos lados.
- **Demo en vivo puede fallar**: siempre tener el modo de datos simulados listo como Plan B, no solo para el sensor sino para toda la demo si el wifi del venue falla.
