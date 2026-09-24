# Observaciones de trabajo — BotFast-BotBuilder

## 2026-09-24 — Tarea 1: Generalización del chatbot + limpieza de dependencias
- **Qué se hizo:**
  - `schemas.ts` y `chatbotFlow.ts` reescritos: el chatbot ahora es genérico para cualquier negocio, tiene 5 personalidades (`profesional`, `entusiasta`, `divertido`, `formal`, `ventas`) y devuelve `shouldEscalate` cuando detecta intención de compra/reserva. Se quitaron las tools de reservación de eventos.
  - Se eliminaron `src/ai/tools/eventBookingTools.ts`, `src/services/eventService.ts`, `src/types/index.ts` y `src/components/OpportunityCard.tsx`.
  - `ChatbotInterface.tsx` recibe la prop `personality` y muestra el aviso "Cliente listo para cerrar" cuando `shouldEscalate` es verdadero. `page.tsx` agrega un selector de personalidad en "Personalización Visual" y pasa la personalidad a las dos instancias del chat.
  - `package.json`: se quitaron `mysql`, `firebase`, `firebase-admin`, `axios`, `cheerio`, `@huggingface/inference`, `patch-package`, `pdf-parse`, `@types/mysql` y `@types/pdf-parse`. Se regeneró `package-lock.json`.
- **Problemas encontrados:**
  - `npm run typecheck` falló por un error que ya existía antes en `src/app/page.tsx` (línea ~96): `pdfjsLib.getDocument({ data: arrayBuffer })` no aceptaba un `ArrayBuffer`. Se resolvió pasando `new Uint8Array(arrayBuffer)`.
  - En el sandbox, `npm run build` falló porque no se pudo descargar la fuente `Inter` de Google Fonts (`ECONNRESET` contra fonts.googleapis.com). Es una limitación de red del entorno, no del código. Para comprobar el resto del build se desactivó `next/font` de forma temporal: el build terminó bien y luego se restauró `layout.tsx` sin cambios. Con acceso normal a internet el build debería pasar tal cual.
  - No quedaron referencias rotas a `@/types` ni a los archivos eliminados.
- **Estado final:** `typecheck` pasa sin errores; `build` compila bien (la descarga de Google Fonts no se pudo probar en el sandbox). La Tarea 3 (runtime de WhatsApp) no se ha empezado y espera revisión.

## 2026-09-23 — Tareas 3.0 a 3.2: merge, archivo de estado y scaffold del runtime de WhatsApp
- **3.0 (merge a master):** no se hizo directamente. Esta sesión de Arena solo puede hacer push en la rama `arena/01a0d11d-botfast-botbuilder` y no puede fusionar a `master` ni borrar esa rama. En su lugar se abrió un Pull Request de esa rama hacia `master` para que el dueño lo fusione (y borre la rama si quiere) desde GitHub.
- **3.1:** se creó `ESTADO_Y_OBJETIVO_DEL_PROYECTO.md` con el contenido indicado.
- **3.2:** se creó `runtime/`, un paquete Node + TypeScript independiente (ESM, con su propio `package.json`, `tsconfig.json`, `.gitignore` y `.env.example`):
  - `src/app.ts`: BuilderBot + `@builderbot/provider-meta`; lee las credenciales de env vars y expone `GET/POST /webhook` en `PORT` (3008 por defecto).
  - `src/connectors/sheets.ts`: lee todas las pestañas del Sheet con una cuenta de servicio (`google-spreadsheet` + `google-auth-library`, solo lectura), con caché en memoria de 5 min. Incluye helpers para convertir el Sheet en base de conocimiento y extraer la pestaña `Contacto`.
  - `src/engine/intent.ts`: `detectPurchaseIntent()` usa solo regex y palabras clave en español, normalizando acentos y mayúsculas.
  - `src/engine/brain.ts`: replica de forma independiente el prompt de `chatbotFlow.ts` (personalidad, base de conocimiento, filtro de clientes) y llama a Gemini con `@google/generative-ai`. No importa código del proyecto Next.js.
  - `src/flows/mainFlow.ts`: si hay intención → responde con los datos de contacto del Sheet, sin IA; si no → Gemini con el Sheet como contexto. Guarda los últimos 10 mensajes por usuario en el estado de BuilderBot.
  - `runtime/README.md`: variables, formato del Sheet y cómo correr `npm run dev`.
  - Se agregaron variables opcionales al `.env.example`: `BUSINESS_NAME`, `BUSINESS_SHEET_ID`, `BUSINESS_PERSONALITY`, `GEMINI_MODEL` y `PORT`. En la fase 1 hay un solo negocio configurado por env vars.
- **Problemas encontrados:**
  - "comprensible" y "comprendo" daban falso positivo con la raíz `compr`. Se cambió a `compr(?!en[ds])`, y "orden" suelto por "ordenar".
  - Al arrancar, el proveedor de Meta valida las credenciales contra la Graph API. Con credenciales inválidas o sin red, la promesa rechazada tumbaba el proceso. Se agregó un `unhandledRejection` handler que registra el error y mantiene el webhook activo.
  - Los tipos de los callbacks de `addKeyword` no se inferían bajo `NodeNext`; se tiparon explícitamente con `BotContext` y `BotMethods` de `@builderbot/bot/dist/types.js`.
- **Pruebas hechas (sin credenciales reales):** `npm run typecheck` en `runtime/` pasa sin errores. `detectPurchaseIntent` se probó con 11 frases de ejemplo y dio el resultado esperado en todas. Con valores falsos, el servidor arrancó y la verificación del webhook funcionó: devuelve el `hub.challenge` con el token correcto y 403 con uno incorrecto. **No se probó** la lectura real del Google Sheet ni la llamada a Gemini, porque no hay credenciales en el sandbox (a propósito).
- **Estado final:** el scaffold de la fase 1 compila y arranca. El trabajo se detiene aquí hasta la revisión: no se ha conectado ningún número de WhatsApp real ni se ha desplegado nada.
