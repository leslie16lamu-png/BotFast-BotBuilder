/**
 * Arranque del runtime de WhatsApp (BuilderBot + WhatsApp Cloud API de Meta).
 * Expone el webhook en GET/POST /webhook del puerto PORT (por defecto 3008).
 */
import { createBot, createFlow, createProvider, MemoryDB } from '@builderbot/bot';
import { MetaProvider } from '@builderbot/provider-meta';
import { PORT, requireEnv } from './config.js';
import { mainFlow } from './flows/mainFlow.js';

async function main() {
  const provider = createProvider(MetaProvider, {
    jwtToken: requireEnv('META_JWT_TOKEN'),
    numberId: requireEnv('META_NUMBER_ID'),
    verifyToken: requireEnv('META_VERIFY_TOKEN'),
    version: process.env.META_VERSION || 'v21.0',
  });

  const { httpServer } = await createBot({
    flow: createFlow([mainFlow]),
    provider,
    database: new MemoryDB(),
  });

  httpServer(PORT);
  console.log(`[runtime] Webhook escuchando en http://0.0.0.0:${PORT}/webhook`);
}

// El proveedor de Meta valida credenciales al iniciar; si falla (credenciales
// inválidas o sin red), se registra el error pero el webhook sigue arriba.
process.on('unhandledRejection', (reason) => {
  console.error('[runtime] Promesa rechazada sin manejar:', reason instanceof Error ? reason.message : reason);
});

main().catch((error) => {
  console.error('[runtime] Error al iniciar:', error);
  process.exit(1);
});
