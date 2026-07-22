# Guía de investigación previa: fuentes de datos de referencia

## Objetivo
Antes de programar el motor de riesgo (`risk-engine.js`), necesitamos encontrar y citar datos reales publicados sobre las tasas de pérdida ósea/muscular en:
1. Microgravedad (astronautas).
2. Estudios de reposo en cama (bed-rest), el análogo terrestre que usa la NASA para simular microgravedad.

Esto es lo que justifica el proyecto ante el jurado: no estamos inventando números, estamos aplicando ciencia real ya publicada a un problema cotidiano.

## Dónde buscar

### 1. NASA Human Research Program (HRP)
- **Human Research Roadmap**: https://humanresearchroadmap.nasa.gov — busca los "Risk" de "Bone Fracture" y "Reduced Physical Performance Capabilities". Cada uno tiene Evidence Reports públicos en PDF con los números exactos que necesitamos.
- Portal general: https://www.nasa.gov/humanresearchprogram

### 2. NASA Technical Reports Server (NTRS)
- https://ntrs.nasa.gov
- Términos de búsqueda: `bed rest muscle atrophy`, `bed rest bone loss`, `microgravity countermeasures`, `head-down tilt bed rest`, `ARED exercise countermeasure`

### 3. NASA Life Sciences Data Archive (LSDA)
- https://lsda.jsc.nasa.gov
- Archivo de datos de experimentos de ciencias de la vida en vuelos espaciales y análogos terrestres (bed-rest).

### 4. PubMed / PMC (NCBI) — literatura científica revisada por pares
- https://pubmed.ncbi.nlm.nih.gov
- API gratuita si quieren automatizar búsquedas: E-utilities (https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- Términos de búsqueda (en inglés, la mayoría de la literatura está en inglés): `bed rest AND muscle atrophy`, `bed rest AND bone mineral density`, `spaceflight AND sarcopenia`, `head-down tilt bed rest AND countermeasure`

### 5. Estudios de la ESA/DLR (Alemania)
- El centro `:envihab` de DLR en Colonia hace estudios de bed-rest para la ESA — buscar "DLR bed rest study" o ":envihab bed rest".

## Papers concretos para empezar (ya verificados, punto de partida — ver `docs/fuentes.md`)
- "Simulating human space physiology with bed rest" — PMC2577398
- "How to prevent the detrimental effects of two months of bed-rest on muscle, bone and cardiovascular system: an RCT" — PMC5640633
- "Effects of bedrest 5: the muscles, joints and mobility" — Nursing Times

## Qué números específicos necesitamos extraer
- [ ] % de pérdida de masa muscular por día/semana de reposo en cama — separar por edad si el paper lo permite (adultos jóvenes vs. adultos mayores suelen tener tasas distintas)
- [ ] % de pérdida de densidad ósea por mes, en microgravedad y en bed-rest
- [ ] Umbral mínimo de actividad/carga que previene o ralentiza significativamente la pérdida (para poder comparar la actividad real del usuario contra algo concreto)
- [ ] Qué tan rápido se recupera el músculo/hueso al retomar actividad (para que la recomendación de ejercicio mejore el score de forma creíble)

## Cómo documentar y citar (para el README y el video)
1. Cada persona que encuentre un dato agrega la cita completa a `docs/fuentes.md` en el momento, no al final — evita perder la fuente.
2. Formato de cita simple: Autor(es) (Año). *Título*. Revista/Fuente. Link.
3. En el README del proyecto, sección "Fundamento científico" listando las fuentes usadas.
4. En el video de presentación, mencionar explícitamente 1-2 fuentes por nombre — le da credibilidad instantánea al jurado (ej. "usamos las tasas de pérdida ósea publicadas por el Human Research Program de la NASA...").
5. Incluir siempre el disclaimer: "Este proyecto es un modelo educativo basado en investigación científica publicada, no un dispositivo médico ni una herramienta de diagnóstico."

## Cómo justificamos el trabajo ante el jurado
- El problema es real y medible (números concretos de pérdida muscular/ósea, no una sensación vaga).
- La ciencia no la inventamos nosotros — la tomamos de fuentes públicas y verificables (NASA, papers revisados por pares).
- El vacío que llenamos es de accesibilidad: esta ciencia existe hace años, pero nadie la ha convertido en una herramienta que cualquier persona pueda usar con el sensor de su propio celular, sin hardware especial ni cita médica.
