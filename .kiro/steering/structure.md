# Estructura del proyecto

```
/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── modules/
│   │   ├── motion-tracker.js      # Acelerómetro + filtro de patrón rítmico
│   │   ├── bluetooth-tracker.js   # Conexión Bluetooth genérica (heart_rate)
│   │   ├── manual-tracker.js      # Entrada manual de actividad
│   │   ├── activity-manager.js    # Orquesta las 3 fuentes + promedio móvil
│   │   ├── session-manager.js     # Estados idle/active/saved de la sesión
│   │   ├── onboarding.js          # Cuestionario cold-start
│   │   ├── risk-engine.js         # Score de riesgo (lee reference-curves.json)
│   │   └── recommendations.js     # Catálogo de ejercicios marcables
│   └── ui/
│       ├── app.js                 # Orquestador de la SPA
│       ├── activity-panel.js      # Panel de Bluetooth + entrada manual
│       └── styles.css
├── data/
│   └── reference-curves.json  # Curvas de deterioro extraídas de la investigación
├── docs/
│   ├── investigacion-previa.md
│   ├── metricas-extraidas.md
│   └── fuentes.md              # Bibliografía citada
├── README.md
└── .kiro/
    ├── steering/                # Este archivo y los otros (product.md, tech.md, criterios-evaluacion.md)
    └── specs/
        ├── sedentarismo-tracker/   # Spec principal (requirements, design, tasks)
        └── ui-result-components/   # Spec de pulido responsive/defensivo
```

## Roles del equipo

| Rol | Responsable | Archivos que le corresponden |
|---|---|---|
| A — Datos (sensores) | Ulises Terrón | `motion-tracker.js`, `bluetooth-tracker.js`, `manual-tracker.js` |
| B — Ciencia / Motor de riesgo | Jessica Garduño | `risk-engine.js`, `recommendations.js`, `data/reference-curves.json`, `docs/investigacion-previa.md`, `docs/fuentes.md` |
| C — Visualización | Donovan López | `app.js` (gauge/dashboard), `styles.css` |
| D — UI / Integración / Deploy | Juan Gamboa | `index.html`, `activity-panel.js`, `session-manager.js`, integración general, deploy, `README.md` |

Cada quien trabaja principalmente en sus archivos para minimizar conflictos de merge en Git, pero todos revisan `tasks.md` a diario para saber en qué va el resto.
