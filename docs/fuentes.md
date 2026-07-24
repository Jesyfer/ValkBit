# Fuentes científicas citadas

Formato: Autor(es) (Año). *Título*. Revista/Fuente. Link.

> Cada persona del equipo agrega aquí la cita completa en el momento en que encuentra un dato útil — no dejarlo para el final.

## Fuentes principales (usadas en `data/reference-curves.json`)
- NASA Human Research Program (2024). *Evidence Report: Risk of Bone Fracture due to Spaceflight-induced Changes to Bone* (HRP-F07-ERFT.R2). Aprobado 18 julio 2024. Archivo local: `docs/Bone Fracture Evidence Report_07-18-2024.pdf`. Tabla 2 (p.18-19): tasas de pérdida ósea con y sin contramedida ARED, datos de Sibonga et al. 2019 y Lang et al. 2004.
- NASA Human Research Program (2024). *Evidence Report: Risk of Impaired Performance due to Reduced Muscle Mass, Strength & Endurance / Risk of Reduced Physical Performance Capabilities due to Reduced Aerobic Capacity*. Archivo local: `docs/Evidence report aerobic and muscle_FINAL 4-3-2024.pdf`. Resumen ejecutivo: >10-20% pérdida de capacidad aeróbica/fuerza tras misiones de larga duración. Sección de bed-rest (p.63-66): comparación directa espacio vs. bed-rest.
- Kramer A, Gollhofer A, Armbrecht G, Felsenberg D, Gruber M (2017). *How to prevent the detrimental effects of two months of bed-rest on muscle, bone and cardiovascular system: an RCT*. Scientific Reports (Nature). Archivo local: `docs/PMC5640633.pdf`. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5640633 — RCT con 23 participantes, 60 días de bed-rest: grupo control vs. entrenamiento de salto. Es la fuente más limpia para los valores "a 60 días" del JSON (fuerza, masa magra, VO2peak, densidad ósea tibial).
- Narici et al. (1989), citado en: *Deconditioning and Reconditioning Humans in Stressful Environments* (NASA, 2001). Archivo local: `docs/20010096246_ Deconditioning and Reconditioning Humans in Stressful Environments.pdf`. Única fuente con tasas *diarias* limpias (0.3%/día pérdida de fuerza, 0.1%/día pérdida de área muscular).

## Fuentes de apoyo (contexto adicional, no usadas directamente en las curvas)
- Jost PD (2008). *Simulating human space physiology with bed rest*. Hippokratia. Archivo local: `docs/PMC2577398.pdf`. https://ncbi.nlm.nih.gov/pmc/articles/PMC2577398 — revisión de estudios ESA (LTBR, WISE), útil para la nota de diferencia hombres/mujeres.
- Effects of bedrest 5: the muscles, joints and mobility. Nursing Times. https://www.nursingtimes.net/musculoskeletal-and-orthopaedics/effects-of-bedrest-5-the-muscles-joints-and-mobility-18-03-2019/ — no se pudo verificar el contenido completo (ver `metricas-extraidas.md`), no usado en las curvas.

## Cómo citarlas en el pitch/video (ejemplos concretos)
- "Usamos las tasas reales de pérdida ósea que la NASA midió en astronautas: hasta 1.06% de densidad ósea perdida por mes en el cuello femoral sin ejercicio de contramedida, contra solo 0.32% con el protocolo ARED — la misma comparación que hace nuestra app entre no moverte y seguir la recomendación de ejercicio."
- "El propio Human Research Program de la NASA reporta que una porción grande de los astronautas regresa con más de 10-20% de pérdida de capacidad aeróbica y muscular tras misiones largas — ese es el mismo mecanismo, en cámara lenta, detrás del sedentarismo."
- "Un estudio publicado en Scientific Reports (Nature) mostró que 60 días de inactividad reducen la fuerza de pierna hasta 40% y la capacidad aeróbica hasta 29% — pero un grupo que hizo un entrenamiento corto de saltos no mostró ninguna pérdida significativa. Esa es la ciencia detrás de nuestro motor de recomendaciones."
