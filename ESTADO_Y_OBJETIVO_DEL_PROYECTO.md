# BotFast / BotBuilder — Estado y Objetivo del Proyecto

## 1. Objetivo
Democratizar la automatización conversacional para micro-negocios (1-3 personas): un constructor de chatbots con IA que el negocio pueda armar sin conocimientos técnicos, entregando un asistente que responde preguntas, tiene personalidad e idioma configurables (incluyendo "experto en ventas"), y filtra clientes: cuando detecta intención real de comprar/reservar/agendar/cotizar, dirige al cliente a cerrar directamente con el dueño del negocio vía un link de WhatsApp. El chatbot vive en su propia página/widget web.

## 2. Modelo de negocio
Venta única de configuración por chatbot (no suscripción). Cobro extra por actualizaciones mayores de catálogo. Diferenciador: cero configuración técnica para el cliente final.

## 3. Arquitectura: dos piezas complementarias (cambio de enfoque 2026-09-24)

- **Constructor (wizard)**: app Next.js + Genkit donde se entrena, personaliza (personalidad, idioma, colores, logo, redes sociales) y prueba el chatbot antes de entregarlo. Ya existe y fue generalizado (ver Tareas 1, 4 y 5 en OBSERVACIONES.md). **Mecanismo principal de cierre/escalamiento**: cuando el modelo detecta intención de cierre, devuelve `shouldEscalate`, `actionType` y `closingSummary`; el frontend (`ChatbotInterface`) muestra un botón verde que abre `https://wa.me/[número]?text=[resumen]` — abre el WhatsApp normal del negocio con un mensaje ya redactado resumiendo lo que el cliente quiere. No requiere WhatsApp Cloud API, no requiere verificación de Meta, no tiene riesgo de baneo porque no es una conexión automatizada, es solo un link.

- **Runtime de WhatsApp (secundario / futuro)**: motor en `runtime/` que atendía clientes reales vía WhatsApp Cloud API (BuilderBot + Meta), leyendo el catálogo desde Google Sheet. Queda en pausa como funcionalidad secundaria para más adelante — útil si algún día se quiere que el bot también conteste mensajes que lleguen directo al WhatsApp del negocio. No se toca ni se borra, simplemente deja de ser la prioridad y no es bloqueante para el MVP.

## 4. Dónde estamos
- [x] Diagnóstico del repo original.
- [x] Tarea 1: generalización del chatbot + limpieza de dependencias (ver OBSERVACIONES.md).
- [x] Tarea 2: archivo de observaciones creado.
- [x] Tarea 3: runtime de WhatsApp scaffold (fase 1) — completado y pausado.
- [x] Tarea 4: `.env.example` visible, pruebas automatizadas, Dockerfile, README despliegue.
- [x] Tarea 5: cambio de enfoque a link wa.me, selector de idioma (es/en) y botones de redes sociales configurables.

## 5. Qué sigue después del runtime base
- Multi-tenant real (varios negocios a la vez) usando el gestor de BuilderBot — ahora secundario.
- Conectar la función "Exportar" del wizard (hoy es un botón sin funcionalidad) con la configuración que consume el runtime / página pública.
- Cobro automático de planes (pendiente, no bloqueante para el MVP).

## 6. Backlog / pendiente, no urgente
- Construir de verdad el botón "Obtener Link" del wizard (hoy es un placeholder) para generar la página pública que el negocio comparte.
- Protección básica contra abuso (rate limiting) antes de exponer el chatbot públicamente, para que nadie agote la cuota de la API de Gemini del negocio.
- Estadísticas de uso (cuántas conversaciones, cuántas escalaron) — requeriría algo de almacenamiento, hoy no existe.
- Ampliar idiomas más allá de español/inglés si algún cliente lo pide.
- Revisar más adelante si conviene retomar `runtime/` (Cloud API oficial o Embedded Signup) para negocios que sí quieran recibir mensajes directo en su WhatsApp además del widget web.
