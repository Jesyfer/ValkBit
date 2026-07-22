# Requerimientos: Contramedida (Predictor de riesgo por sedentarismo)

## Historia 1: Captura de actividad
Como usuario, quiero que la app mida mi actividad física real usando el sensor de mi dispositivo, para saber objetivamente qué tan sedentario he estado.

- WHEN el usuario abre la app por primera vez, THE SYSTEM SHALL solicitar permiso de acceso al sensor de movimiento del dispositivo.
- WHEN el permiso es concedido, THE SYSTEM SHALL registrar datos de movimiento de forma continua mientras la app está activa.
- IF el usuario niega el permiso o el navegador no soporta el sensor, THEN THE SYSTEM SHALL ofrecer un modo de entrada manual/simulada como alternativa para no bloquear la demo.

## Historia 2: Cálculo de riesgo
Como usuario, quiero ver un score de riesgo claro y comprensible, para entender mi situación sin necesitar conocimientos médicos.

- WHEN se han acumulado suficientes datos de actividad, THE SYSTEM SHALL calcular un score de riesgo comparando la actividad real contra las curvas de referencia de deterioro por sedentarismo.
- THE SYSTEM SHALL clasificar el riesgo en al menos tres niveles (bajo, medio, alto).
- THE SYSTEM SHALL mostrar el score de forma visual, no solo como número crudo.

## Historia 3: Recomendaciones
Como usuario, quiero recibir sugerencias de ejercicio específicas, para reducir mi riesgo de forma activa.

- IF el riesgo calculado es medio o alto, THEN THE SYSTEM SHALL mostrar al menos una recomendación de ejercicio concreta basada en protocolos reales de contramedida (tipo ARED simplificado).
- WHEN el usuario marca una recomendación como completada, THE SYSTEM SHALL reflejar la mejora en el score.

## Historia 4: Transparencia científica
Como usuario, quiero entender de dónde sale la ciencia detrás del score, para confiar en la herramienta.

- THE SYSTEM SHALL mostrar, en algún punto de la interfaz, las fuentes científicas (NASA HRP, estudios de bed-rest) en las que se basa el modelo.
- THE SYSTEM SHALL incluir un aviso claro de que es un modelo educativo/ilustrativo, no un dispositivo médico.

## Historia 5: Proyección a futuro
Como usuario, quiero ver cómo cambiaría mi riesgo si mantengo mi comportamiento actual, para entender la urgencia de actuar.

- WHEN el usuario lo solicita, THE SYSTEM SHALL proyectar la trayectoria de riesgo a futuro (ej. a 30/60/90 días) basada en su nivel de actividad actual y las curvas de deterioro de referencia.
