# Estructura del proyecto

```
/
├── index.html
├── src/
│   ├── motion-tracker.js      # Captura de datos del acelerómetro
│   ├── risk-engine.js         # Lógica de score de riesgo (curvas de referencia)
│   ├── recommendations.js     # Motor de recomendaciones de ejercicio
│   ├── visualization.js       # Dashboard visual (reserva de hueso/músculo)
│   └── styles.css
├── data/
│   └── reference-curves.json  # Curvas de deterioro extraídas de la investigación
├── docs/
│   ├── investigacion-previa.md
│   └── fuentes.md              # Bibliografía citada
├── README.md
└── .kiro/
    ├── steering/                # Este archivo y los otros dos (product.md, tech.md)
    └── specs/
        └── sedentarismo-tracker/
            ├── requirements.md
            ├── design.md
            └── tasks.md
```

## Roles del equipo

| Rol | Responsable | Archivos que le corresponden |
|---|---|---|
| A — Datos (sensores) | *(nombre)* | `motion-tracker.js` |
| B — Ciencia / Motor de riesgo | *(nombre)* | `risk-engine.js`, `recommendations.js`, `data/reference-curves.json`, `docs/investigacion-previa.md`, `docs/fuentes.md` |
| C — Visualización | *(nombre)* | `visualization.js`, `styles.css` |
| D — UI / Integración / Deploy | *(nombre)* | `index.html`, integración general, deploy, `README.md` |

Cada quien trabaja principalmente en sus archivos para minimizar conflictos de merge en Git, pero todos revisan `tasks.md` a diario para saber en qué va el resto.
