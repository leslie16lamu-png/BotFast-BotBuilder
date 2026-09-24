# BotFast / BotBuilder — Estado y Objetivo del Proyecto

## 1. Objetivo
Democratizar la automatización conversacional para micro-negocios (1-3 personas): un constructor de chatbots con IA que el negocio pueda armar sin conocimientos técnicos, entregando un asistente que responde preguntas, tiene personalidad configurable (incluyendo "experto en ventas"), y filtra clientes: cuando detecta intención real de comprar/reservar/agendar, dirige al cliente a cerrar directamente con el dueño del negocio. Debe vivir en WhatsApp (Cloud API oficial de Meta).

## 2. Modelo de negocio
Venta única de configuración por chatbot (no suscripción). Cobro extra por actualizaciones mayores de catálogo. Diferenciador: cero configuración técnica para el cliente final.

## 3. Arquitectura: dos piezas complementarias
- **Constructor (wizard)**: app Next.js + Genkit donde se entrena, personaliza y prueba el chatbot antes de entregarlo. Ya existe y fue generalizado (ver Tarea 1 en OBSERVACIONES.md).
- **Runtime de WhatsApp**: motor que atiende clientes reales vía WhatsApp Cloud API, lee el catálogo del negocio desde su Google Sheet, decide con reglas (no IA) si escalar al dueño. En construcción (carpeta `runtime/`).

## 4. Dónde estamos
- [x] Diagnóstico del repo original.
- [x] Tarea 1: generalización del chatbot + limpieza de dependencias (ver OBSERVACIONES.md).
- [x] Tarea 2: archivo de observaciones creado.
- [ ] Tarea 3: runtime de WhatsApp — en curso.

## 5. Qué sigue después del runtime base
- Multi-tenant real (varios negocios a la vez) usando el gestor de BuilderBot.
- Conectar la función "Exportar" del wizard (hoy es un botón sin funcionalidad) con la configuración que consume el runtime.
- Cobro automático de planes (pendiente, no bloqueante para el MVP).
