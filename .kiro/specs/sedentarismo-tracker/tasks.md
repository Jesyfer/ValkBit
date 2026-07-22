# Tareas: Contramedida — Plan de 5 días

Roles: **A** = Datos/sensores · **B** = Ciencia/motor de riesgo · **C** = Visualización · **D** = UI/Integración/Deploy

## Día 1 — Fundamentos
- [ ] (A) Prototipo de captura de `DeviceMotion` en navegador, probado en al menos 2 dispositivos distintos (idealmente uno Android y uno iOS)
- [ ] (B) Completar investigación previa (ver `docs/investigacion-previa.md`) y llenar `data/reference-curves.json` con valores reales citados
- [ ] (C) Wireframe del dashboard (papel o Figma) — definir el "look" de la barra/medidor de reserva
- [ ] (D) Setup del repositorio en GitHub, estructura de carpetas, pipeline de deploy inicial (aunque esté vacío)

## Día 2 — Piezas funcionando por separado
- [ ] (A) Pipeline de datos de actividad funcionando end-to-end (minutos activos reales, no solo datos crudos del sensor)
- [ ] (B) Fórmula del score de riesgo implementada y probada con datos de ejemplo (no reales todavía)
- [ ] (C) Prototipo visual básico (sin datos reales todavía, con datos de prueba)
- [ ] (D) Definir flujo completo de pantallas de la app (onboarding → dashboard → recomendaciones)

## Día 3 — Integración
- [ ] (A + B) Conectar datos reales de actividad al motor de riesgo
- [ ] (B) Motor de recomendaciones basado en reglas
- [ ] (C) Visualización reacciona a datos reales del motor de riesgo
- [ ] (D) Integrar pantalla de recomendaciones a la UI general

## Día 4 — Pulido
- [ ] (A) Pruebas en distintos dispositivos/navegadores, manejo de errores de permisos
- [ ] (B) Revisar que los textos/explicaciones sean precisos y no suenen a diagnóstico médico (repasar el disclaimer)
- [ ] (C) Pulido visual y transiciones
- [ ] (D) Deploy final en Vercel/Netlify (o AWS), pruebas cruzadas en navegadores distintos

## Día 5 — Cierre
- [ ] (Todos) Ensayo completo de demo, cronometrado a menos de 5 minutos
- [ ] (Todos) Grabar video de presentación (máx. 5 min: objetivos, componentes principales, demo funcional)
- [ ] (D) Completar README con: título, descripción, reto, fuentes citadas, link de demo, roles del equipo
- [ ] (Todos) Revisar checklist de entregables antes de subir (título, descripción, reto, repo público + README, demo en línea, video)
