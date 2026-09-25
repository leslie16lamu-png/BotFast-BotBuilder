# BotFast — Runtime de WhatsApp (fase 1)

Motor que atiende a los clientes reales por WhatsApp Cloud API (Meta) usando
[BuilderBot](https://builderbot.app). Es un paquete independiente del wizard Next.js
de la raíz y tiene su propio `package.json`.

## Cómo funciona
1. Meta envía cada mensaje entrante al webhook `POST /webhook`.
2. `src/flows/mainFlow.ts` revisa el texto con `detectPurchaseIntent` (`src/engine/intent.ts`, solo reglas y palabras clave, sin IA).
   - **Hay intención de compra/reserva:** responde con los datos de contacto de la pestaña `Contacto` del Google Sheet y no llama a la IA.
   - **No hay intención:** llama a Gemini (`src/engine/brain.ts`) con el contenido del Sheet como base de conocimiento, con la misma lógica de prompt y personalidad que el wizard.
3. El Sheet se lee con una cuenta de servicio (`src/connectors/sheets.ts`) y se guarda en caché 5 minutos.

## Estructura
```
src/
  app.ts                 arranque de BuilderBot + proveedor Meta (webhook)
  config.ts              lectura de variables de entorno
  connectors/sheets.ts   lectura del Google Sheet con caché de 5 min
  engine/intent.ts       detección de intención por palabras clave
  engine/brain.ts        prompt + llamada a Gemini
  flows/mainFlow.ts      flujo principal
```

## Variables de entorno
Copia `.env.example` a `.env` y llénalo **en tu máquina o en tu plataforma de despliegue**.
Nunca subas `.env` al repositorio (está en `.gitignore`).

| Variable | Descripción |
|---|---|
| `META_JWT_TOKEN` | Token de acceso de la app de Meta (WhatsApp Cloud API) |
| `META_NUMBER_ID` | *Phone number ID* del número de WhatsApp |
| `META_VERIFY_TOKEN` | Texto que tú eliges; debe ser igual al que pongas en Meta al registrar el webhook |
| `META_VERSION` | Versión de Graph API (ej. `v21.0`; si se deja vacío se usa `v21.0`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Correo de la cuenta de servicio de Google Cloud |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Llave privada de la cuenta de servicio (los `\\n` escapados se convierten solos) |
| `GEMINI_API_KEY` | API key de Google AI Studio |
| `BUSINESS_NAME` | (opcional) Nombre del negocio |
| `BUSINESS_SHEET_ID` | (opcional) ID del Google Sheet del negocio (el tramo de la URL entre `/d/` y `/edit`) |
| `BUSINESS_PERSONALITY` | (opcional) `profesional` · `entusiasta` · `divertido` · `formal` · `ventas` |
| `GEMINI_MODEL` | (opcional) por defecto `gemini-2.0-flash` |
| `PORT` | (opcional) por defecto `3008` |

## Formato del Google Sheet
- Comparte el Sheet (solo lectura) con el correo de la cuenta de servicio.
- Cada pestaña (ej. `Menu`, `Horarios`, `Precios`) debe tener encabezados en la primera fila. Todas las pestañas se convierten en texto para la IA.
- Una pestaña llamada **`Contacto`** con columnas `campo` y `valor` (ej. `WhatsApp | 444 123 4567`). Es lo que se envía al cliente cuando hay intención de compra.

## Correr localmente
```bash
cd runtime
npm install
cp .env.example .env   # y llénalo
npm run dev            # recarga automática; también: npm start
npm run typecheck
```
El servidor queda escuchando en `http://0.0.0.0:3008/webhook`. Para que Meta lo alcance
desde internet en pruebas locales, usa un túnel (ej. `ngrok http 3008`) y registra
`https://<tu-túnel>/webhook` con tu `META_VERIFY_TOKEN` en la configuración de WhatsApp de tu app.

Para comprobar la verificación del webhook:
```bash
curl "http://localhost:3008/webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=123"
# debe responder: 123
```

## Despliegue

Este servicio necesita un **proceso persistente** porque mantiene un servidor HTTP siempre activo para el webhook de Meta y guarda estado en memoria (caché del Sheet, historial de conversación por usuario).

- **Recomendado:** Railway, Render, Fly.io, o cualquier VPS con Docker. Usa el `Dockerfile` incluido (dos etapas: build con `npm ci` + `tsc`, y runner con `npm ci --omit=dev` + `node dist/app.js`). Configura las variables de entorno en la plataforma y expone el puerto `PORT`.
- **No recomendado:** Vercel o Netlify en modo serverless / functions. Ese modelo corta el proceso entre peticiones y rompe el proveedor de BuilderBot y la caché en memoria.

El wizard de la raíz (Next.js) sí puede seguir desplegado en Vercel/Netlify sin problema, porque es una app web estática/serverless independiente de este runtime.

> ⚠️ No conectes el número real de WhatsApp ni despliegues a producción sin la aprobación del dueño del proyecto.
