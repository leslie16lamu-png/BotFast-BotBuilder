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

## 2026-09-24 — Tareas 3.0 a 3.2: merge, archivo de estado y scaffold del runtime de WhatsApp
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

## 2026-09-24 — Tarea 4: .env.example, pruebas, Dockerfile y despliegue
- **Qué se hizo:**
  - **4.1 `.env.example`:** el `.gitignore` de la raíz tenía `.env*` que bloqueaba también `runtime/.env.example`. Se agregó `!.env.example` inmediatamente debajo para permitir el ejemplo. Se creó `runtime/.env.example` con todas las variables requeridas (`META_JWT_TOKEN`, `META_NUMBER_ID`, `META_VERIFY_TOKEN`, `META_VERSION=v21.0`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `GEMINI_API_KEY`, `BUSINESS_NAME`, `BUSINESS_SHEET_ID`, `BUSINESS_PERSONALITY=profesional`, `GEMINI_MODEL=gemini-2.0-flash`, `PORT=3008`). Verificado con `git check-ignore`: `runtime/.env.example` ya no se ignora (exit 1), mientras que `runtime/.env` sigue ignorado.
  - **4.2 Pruebas automatizadas:** se creó `runtime/src/engine/intent.test.ts` usando el runner nativo `node --test` con 12 casos principales (6 true: "quiero reservar una mesa", "cuánto cuesta y cómo pago", "quiero uno de esos", "me lo llevo", "sacar cita", "necesito cotizar el servicio"; 6 false: "no comprendo tu respuesta", "¿tienen todo en orden?", "¿cuál es su horario?", "solo estoy viendo información", "qué colores manejan", "gracias por la información") más 4 casos de borde (vacío, acentos/mayúsculas, "comprendo/comprensible" no debe ser positivo, "orden" suelto vs "ordenar"). Se agregó script `test` en `runtime/package.json` como `node --import tsx --test` para que Node pueda ejecutar TypeScript. Se excluyeron `*.test.ts` del build en `tsconfig.json` (`exclude: ["src/**/*.test.ts", ...]`) y se verificó que `dist/` no contiene archivos de test.
  - **4.3 Despliegue persistente:** se agregó `runtime/Dockerfile` de dos etapas (builder: `npm ci` + `npm run build` con `tsc`; runner: `npm ci --omit=dev`, copia `dist/`, `node dist/app.js`, `EXPOSE 3008`). Se agregó `runtime/.dockerignore` con `node_modules`, `dist`, `.env`, `*.log`, etc. Como no hay Docker en el sandbox, se simuló el flujo: `npm run build`, borrado de `node_modules`, `npm ci --omit=dev` (se comprobó que `tsx` ya no está y que el server arranca con `node dist/app.js` aunque falle la validación de credenciales dummy, gracias al handler de `unhandledRejection`). Se agregó sección "Despliegue" en `runtime/README.md` explicando que el runtime necesita proceso persistente (Railway, Render, Fly.io) y no funciona bien en Vercel/Netlify serverless, mientras que el wizard de la raíz sí puede seguir en ese hosting.
  - **4.4 Observaciones:** se corrigieron fechas anteriores de 2026-09-23 a 2026-09-24 y se agregó esta sección.
- **Problemas encontrados:**
  - `git check-ignore -v runtime/.env.example` sigue mostrando la línea `!.env.example` con exit 0, pero `git check-ignore runtime/.env.example` (sin `-v`) da exit 1, lo que confirma que el archivo ya no está ignorado y aparece como untracked. Es el comportamiento esperado de git con patrones negados.
  - `npm test` falló la primera vez porque `tsx` no estaba instalado tras clonar; se resolvió con `npm ci`.
  - No hay Docker en el sandbox, por lo que se simuló el Dockerfile a mano. El servidor con credenciales dummy muestra `ERROR AUTH` y `Client network socket disconnected...` pero sigue escuchando en `0.0.0.0:3008/webhook`, validando que el handler de promesas rechazadas funciona.
  - `runtime/.env.example` ya existía en la Tarea 3.2 pero no era visible en GitHub porque el `.gitignore` de la raíz lo bloqueaba; ahora con `!.env.example` sí se incluye en el repo.
- **Pruebas hechas:**
  - `npm run typecheck` pasa.
  - `npm run build` genera `dist/` sin `*.test.ts`.
  - `npm test` pasa 16/16 tests.
  - `npm ci --omit=dev && node dist/app.js` arranca y expone `/webhook` (probado con timeout).
  - `git status --ignored` confirma que `.env.example` está untracked y `.env` ignorado.
- **Estado final:** Tarea 4 completa. Queda pendiente subir a GitHub y confirmar que `runtime/.env.example` es visible en remoto. No se conectó ningún número real ni se desplegó nada.
