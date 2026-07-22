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
- Usa `DeviceMotionEvent` (o `Accelerometer` API donde esté disponible) para medir aceleración/movimiento.
- Fallback de datos simulados/manuales si el sensor falla o el navegador no lo soporta (probar iOS Safari temprano — pide permiso distinto a Android/Chrome).
- Output: minutos de actividad activa por período, intensidad promedio.

### 2. Motor de riesgo (`risk-engine.js`)
- Input: actividad real del usuario (de `motion-tracker.js`).
- Referencia: `data/reference-curves.json` (se llena durante la investigación previa — ver `docs/investigacion-previa.md`).
- Lógica: compara actividad real contra el umbral mínimo estimado de la literatura, calcula score de riesgo y proyección a futuro.
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
