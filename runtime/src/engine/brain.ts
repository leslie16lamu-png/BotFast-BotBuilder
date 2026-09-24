/**
 * "Cerebro" de respuesta: replica de forma independiente la lógica del prompt de
 * src/ai/flows/chatbotFlow.ts del wizard (personalidad + base de conocimiento +
 * escalamiento). No importa el código de Next.js porque ese archivo es una Server Action.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireEnv } from '../config.js';

export type Personality = 'profesional' | 'entusiasta' | 'divertido' | 'formal' | 'ventas';
export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export const PERSONALITY_INSTRUCTIONS: Record<Personality, string> = {
  profesional: 'Tono profesional, claro y cortés. Directo al grano, sin informalidades.',
  entusiasta:
    'Tono cálido, positivo y enérgico. Usa exclamaciones con moderación para transmitir entusiasmo genuino.',
  divertido:
    'Tono relajado, cercano y con un toque de humor ligero, sin perder el respeto ni la utilidad de la respuesta.',
  formal: 'Tono formal y protocolar. Evita contracciones informales.',
  ventas:
    'Tono persuasivo y orientado a cerrar la venta: destaca beneficios, genera urgencia legítima (ej. disponibilidad limitada) y siempre invita a dar el siguiente paso. Nunca inventes datos ni presiones con información falsa.',
};

export interface BrainInput {
  businessName: string;
  knowledge: string;
  personality?: Personality;
  chatHistory?: ChatMessage[];
  currentMessageText: string;
}

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
let client: GoogleGenerativeAI | null = null;

export function buildPrompt(input: BrainInput): string {
  const personalityInstruction =
    PERSONALITY_INSTRUCTIONS[input.personality ?? 'profesional'] ??
    PERSONALITY_INSTRUCTIONS.profesional;
  const history = input.chatHistory?.length
    ? input.chatHistory.map((m) => `${m.role}: ${m.text}`).join('\n')
    : '(No hay mensajes anteriores en esta conversación)';

  return `Eres el asistente virtual de "${input.businessName}" y atiendes por WhatsApp. Respondes preguntas de clientes usando EXCLUSIVAMENTE la información de la "Base de Conocimiento" de abajo. Si no sabes algo porque no está en la base de conocimiento, dilo honestamente y sugiere que el cliente contacte directamente al negocio.

**Estilo de personalidad a seguir:** ${personalityInstruction}

**Base de Conocimiento (Acerca de ${input.businessName}):**
---
${input.knowledge}
---

**Memoria Conversacional:**
* Usa SIEMPRE el "Historial de conversación" para recordar lo que el usuario ya dijo. No repitas preguntas ya respondidas.

**Tu función como filtro de clientes:**
* Responde con normalidad preguntas sobre productos, servicios, precios, horarios o dudas generales usando la Base de Conocimiento.
* Si el cliente muestra intención clara de COMPRAR, RESERVAR, AGENDAR O APARTAR, dirígelo amablemente a contactar directamente al negocio con los datos de contacto de la Base de Conocimiento. No inventes procesos de pago ni de reserva.
* Respuestas breves, aptas para WhatsApp (sin markdown complejo).

Historial de conversación (mensajes anteriores):
${history}

Mensaje actual del usuario:
${input.currentMessageText}`;
}

export async function generateReply(input: BrainInput): Promise<string> {
  try {
    client ??= new GoogleGenerativeAI(requireEnv('GEMINI_API_KEY'));
    const model = client.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(buildPrompt(input));
    const text = result.response.text().trim();
    return text || 'Lo siento, tuve un problema al procesar tu solicitud. Por favor, intenta de nuevo.';
  } catch (error) {
    console.error('[brain] Error llamando a Gemini:', error);
    return 'Lo siento, encontré un error interno. Por favor, inténtalo de nuevo más tarde.';
  }
}
