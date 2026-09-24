/**
 * Flujo principal: toda respuesta pasa por aquí.
 * 1) Si hay intención de compra/reserva (reglas) → datos de contacto del Sheet, sin IA.
 * 2) Si no → Gemini con el conocimiento del Sheet como contexto.
 */
import { addKeyword, EVENTS } from '@builderbot/bot';
import type { BotContext, BotMethods } from '@builderbot/bot/dist/types.js';
import { detectPurchaseIntent } from '../engine/intent.js';
import { generateReply, type ChatMessage, type Personality } from '../engine/brain.js';
import { extractContact, readSheet, sheetToKnowledge } from '../connectors/sheets.js';

// Fase 1: un solo negocio, configurado por env vars (multi-tenant vendrá después).
const BUSINESS_NAME = process.env.BUSINESS_NAME ?? 'nuestro negocio';
const BUSINESS_SHEET_ID = process.env.BUSINESS_SHEET_ID ?? '';
const BUSINESS_PERSONALITY = (process.env.BUSINESS_PERSONALITY ?? 'profesional') as Personality;
const MAX_HISTORY = 10;

async function loadBusinessData(): Promise<{ knowledge: string; contact: string | null }> {
  if (!BUSINESS_SHEET_ID) {
    console.warn('[mainFlow] BUSINESS_SHEET_ID no configurado; se responde sin catálogo.');
    return { knowledge: '(Sin información cargada)', contact: null };
  }
  try {
    const tabs = await readSheet(BUSINESS_SHEET_ID);
    return { knowledge: sheetToKnowledge(tabs), contact: extractContact(tabs) };
  } catch (error) {
    console.error('[mainFlow] Error leyendo el Google Sheet:', error);
    return { knowledge: '(No se pudo cargar la información del negocio)', contact: null };
  }
}

export const mainFlow = addKeyword(EVENTS.WELCOME).addAction(
  async (ctx: BotContext, { flowDynamic, state }: BotMethods) => {
    const text: string = ctx.body ?? '';
    const history: ChatMessage[] = (state.get('history') as ChatMessage[]) ?? [];
    const { knowledge, contact } = await loadBusinessData();

    let reply: string;
    if (detectPurchaseIntent(text)) {
      console.log(`[mainFlow] Intención de compra detectada (${ctx.from}) → escalando.`);
      reply = contact
        ? `¡Excelente! Para concretarlo, comunícate directamente con ${BUSINESS_NAME}:\n${contact}`
        : `¡Excelente! En breve alguien de ${BUSINESS_NAME} te atenderá personalmente para concretarlo.`;
    } else {
      reply = await generateReply({
        businessName: BUSINESS_NAME,
        knowledge,
        personality: BUSINESS_PERSONALITY,
        chatHistory: history,
        currentMessageText: text,
      });
    }

    const updated: ChatMessage[] = [
      ...history,
      { role: 'user' as const, text },
      { role: 'assistant' as const, text: reply },
    ].slice(-MAX_HISTORY);
    await state.update({ history: updated });
    await flowDynamic(reply);
  }
);
