# Stack técnico

## Frontend
- Recomendado: Vite + JavaScript vanilla (simplicidad y velocidad de desarrollo para 5 días, sin pelear con un framework si el equipo no lo domina parejo).
- Alternativa si el equipo se siente más cómodo: React + Vite.
- Sin backend obligatorio para el MVP — todo corre en el cliente. Si sobra tiempo, Supabase es la ruta más rápida para agregar persistencia (guardar histórico del usuario).

## APIs y sensores usados
- `DeviceMotionEvent` / `Accelerometer` API (navegador) — captura de actividad/movimiento real. **Probar permisos en iOS Safari desde el día 1** (requiere solicitud explícita de permiso, distinto a Android/Chrome).
- Web Bluetooth API (opcional, fallback/extra) — si consiguen conectar un wearable con acelerómetro compatible BLE. No es requisito para el MVP.

## Despliegue
- **AWS Amplify** — obligatorio en la práctica: el criterio de evaluación "Uso de Servicios de AWS y Kiro" vale 10% de la nota y exige al menos un servicio de AWS. Amplify hace deploy estático casi idéntico en facilidad a Vercel/Netlify, así que no perdemos velocidad por el cambio.
- Alternativa dentro de AWS si prefieren: S3 + CloudFront.
- **No usar Vercel/Netlify como deploy final** — aunque sea más conocido, no cuenta para ese 10%.

## Convenciones de código
- Nombres de archivos: kebab-case (`risk-engine.js`, `motion-tracker.js`).
- Funciones/variables: camelCase.
- Comentarios solo cuando el *porqué* no es obvio — no expliquen qué hace el código, el código ya lo dice.
- Un commit por tarea completada de `tasks.md`, mensaje corto y descriptivo.

## Fuentes de datos de referencia
Ver [`docs/investigacion-previa.md`](../../docs/investigacion-previa.md) — **pendiente de completar por el equipo antes de implementar el motor de riesgo** (Día 1, tarea de la persona a cargo de "Ciencia").
