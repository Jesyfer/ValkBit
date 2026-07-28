# FIRMUS

> La misma ciencia que usa la NASA para proteger a sus astronautas de perder hueso y músculo en el espacio, aplicada a detectar ese riesgo en cualquier persona sedentaria — antes de que sea un problema real.

**Equipo ValkBit — #122**

## Reto
Reto 2 — Aplicaciones web (Hackathon).

## Descripción
FIRMUS mide tu actividad física real usando el sensor de movimiento de tu celular y calcula tu riesgo de pérdida ósea/muscular por sedentarismo, usando las curvas de deterioro publicadas en estudios de reposo en cama (bed-rest) e investigación de microgravedad de la NASA.

## Demo
🔗 [Link al demo en línea] — pendiente

## Fundamento científico
Ver [docs/fuentes.md](docs/fuentes.md) para la bibliografía completa y [docs/investigacion-previa.md](docs/investigacion-previa.md) para la metodología de investigación.

**Disclaimer:** Este proyecto es un modelo educativo basado en investigación científica publicada. No es un dispositivo médico ni una herramienta de diagnóstico clínico.

## Equipo y roles
| Rol | Nombre | Responsabilidad |
|---|---|---|
| Datos (sensores) | Ulises Terrón | Captura de actividad vía sensor de movimiento |
| Ciencia / Motor de riesgo | Jessica Garduño | Investigación previa + lógica de score de riesgo |
| Visualización | Donovan López | Dashboard visual |
| UI / Integración / Deploy | Juan Gamboa | Flujo de pantallas, integración, despliegue |

## Cómo correr el proyecto localmente
```bash
npm install
npm run dev
```

## Stack técnico
Ver [.kiro/steering/tech.md](.kiro/steering/tech.md)

## Estructura del proyecto
Ver [.kiro/steering/structure.md](.kiro/steering/structure.md)

## Especificación (requisitos, diseño, tareas)
Ver [.kiro/specs/sedentarismo-tracker/](.kiro/specs/sedentarismo-tracker/)
