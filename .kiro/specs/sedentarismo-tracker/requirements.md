# Requerimientos: Contramedida (Predictor de riesgo por sedentarismo)

## Historia 1: Onboarding (cold-start, día 1 sin datos)
Como usuario nuevo, quiero dar una estimación rápida de mi sedentarismo la primera vez que abro la app, para tener un punto de partida antes de que existan datos reales.

- WHEN el usuario abre la app por primera vez (sin datos históricos propios guardados), THE SYSTEM SHALL presentar un breve cuestionario (ej. horas sentado al día, si hace ejercicio regularmente) para generar una estimación inicial de riesgo.
- THE SYSTEM SHALL usar esta estimación inicial solo hasta que existan suficientes días de datos reales capturados (ver Historia 2), y entonces darle prioridad a los datos reales.

## Historia 2: Captura de actividad (intento automático + respaldo manual)
Como usuario, quiero que la app mida mi actividad física real, priorizando sensores automáticos pero sin depender 100% de ellos, para tener un dato confiable incluso si el hardware no coopera.

- WHEN el usuario acepta conectar un dispositivo, THE SYSTEM SHALL intentar una conexión por Web Bluetooth genérico (servicio estándar de ritmo cardíaco u otros servicios BLE estándar), compatible con cualquier wearable que lo exponga (no exclusivo de una marca).
- IF no se encuentra ningún dispositivo compatible o la conexión falla, THEN THE SYSTEM SHALL ofrecer de inmediato un campo de captura manual (ej. pasos o minutos activos que el usuario ve en la app de su propio wearable) como alternativa, sin bloquear el uso de la app.
- WHEN el navegador lo soporta, THE SYSTEM SHALL además registrar el acelerómetro del celular como señal complementaria, aplicando un filtro de patrón rítmico (frecuencia de paso ~1-2 Hz) para distinguir movimiento real de manipulación del teléfono en la mano.
- THE SYSTEM SHALL combinar estas fuentes (Bluetooth si conectó, manual si el usuario capturó algo, acelerómetro de fondo) en un solo registro diario de actividad.

## Historia 3: Cálculo de riesgo
Como usuario, quiero ver un score de riesgo claro y comprensible, para entender mi situación sin necesitar conocimientos médicos.

- WHEN existen datos de actividad de varios días, THE SYSTEM SHALL calcular el score de riesgo usando un promedio móvil de los últimos 3-7 días registrados (no un solo instante), para evitar que un momento puntual distorsione el resultado.
- WHILE todavía no hay suficientes días acumulados, THE SYSTEM SHALL usar la estimación inicial del onboarding (Historia 1) como base provisional.
- THE SYSTEM SHALL comparar ese promedio contra las curvas de referencia de deterioro por sedentarismo (`data/reference-curves.json`) para calcular el score.
- THE SYSTEM SHALL clasificar el riesgo en al menos tres niveles (bajo, medio, alto).
- THE SYSTEM SHALL mostrar el score de forma visual, no solo como número crudo.

## Historia 4: Recomendaciones
Como usuario, quiero recibir sugerencias de ejercicio específicas, para reducir mi riesgo de forma activa.

- IF el riesgo calculado es medio o alto, THEN THE SYSTEM SHALL mostrar al menos una recomendación de ejercicio concreta basada en protocolos reales de contramedida (tipo ARED o el entrenamiento validado en el RCT de Kramer 2017).
- WHEN el usuario marca una recomendación como completada, THE SYSTEM SHALL reflejar la mejora en el score.

## Historia 5: Transparencia científica
Como usuario, quiero entender de dónde sale la ciencia detrás del score, para confiar en la herramienta.

- THE SYSTEM SHALL mostrar, en algún punto de la interfaz, las fuentes científicas (NASA HRP, estudios de bed-rest) en las que se basa el modelo.
- THE SYSTEM SHALL incluir un aviso claro de que es un modelo educativo/ilustrativo, no un dispositivo médico.

## Historia 6: Proyección a futuro
Como usuario, quiero ver cómo cambiaría mi riesgo si mantengo mi comportamiento actual, para entender la urgencia de actuar.

- WHEN el usuario lo solicita, THE SYSTEM SHALL proyectar la trayectoria de riesgo a futuro (ej. a 30/60/90 días) basada en su nivel de actividad actual (promedio móvil de Historia 3) y las curvas de deterioro de referencia.
