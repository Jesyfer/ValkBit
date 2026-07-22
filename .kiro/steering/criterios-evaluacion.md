# Criterios de evaluación del hackathon (leer antes de tomar decisiones de scope)

## a) Impacto tecnológico — 30%
¿La propuesta resuelve una necesidad real y aporta valor (desarrollo, empresas o educación)?
- **Cómo lo cubrimos:** el problema está sustentado en datos concretos (pérdida muscular/ósea medible), no en una sensación vaga. Reforzar esto en el README y el video con números reales y su fuente.

## b) Innovación — 30%
Qué tan eficiente es la propuesta frente a alternativas actuales del mercado: ventaja técnica, mejor rendimiento, menor consumo de recursos, mayor escalabilidad/mantenibilidad.
- **Cómo lo cubrimos:** ya validamos que no existe una app haciendo exactamente esto (ver investigación de prior art). Resaltar en el pitch: corre 100% en el navegador, sin wearable ni hardware especial, sin necesidad de cita médica — bajo costo de recursos frente a cualquier alternativa clínica.

## c) Software funcional y entregables — 30%
Mínimo obligatorio:
- [ ] Repositorio público con código + README
- [ ] Enlace del proyecto demo en línea (funcionando de verdad, no un mockup)
- [ ] Video de presentación (máx. 5 min): objetivos + componentes principales + demo funcional, 1 video por equipo, se pueden mostrar fragmentos de código sin info sensible

Valorado pero no obligatorio: diagramas de arquitectura, casos de uso, representaciones visuales.
- **Cómo lo cubrimos:** ya existe un diagrama simple en `design.md` — vale la pena convertirlo en una imagen limpia para el README antes de entregar (punto extra fácil).

## d) Uso de servicios de AWS y Kiro — 10%
Al menos un servicio de AWS (S3, Bedrock, Lambda, RDS, EC2, Amplify, Elastic Beanstalk).
- **Cómo lo cubrimos:** deploy en **AWS Amplify** (ver `tech.md`). Si sobra tiempo, se puede sumar un segundo servicio (ej. S3 para guardar el `reference-curves.json` en vez de tenerlo hardcodeado, o Lambda si se agrega alguna lógica server-side) para reforzar este punto, pero no es prioritario si el tiempo aprieta.

## Prioridad de esfuerzo sugerida dado el peso de cada criterio
1. Que el demo funcione de principio a fin, sin errores, en el navegador (c).
2. Que el video explique bien el problema real y muestre datos/fuentes concretas (a).
3. Que el pitch mencione explícitamente por qué esto no existe ya y por qué es más accesible que las alternativas (b).
4. Amplify para el deploy, nada más si el tiempo no alcanza (d) — es el criterio de menor peso.
