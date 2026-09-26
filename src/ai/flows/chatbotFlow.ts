'use server';
/**
 * @fileOverview Asistente de IA genérico para cualquier tipo de negocio, con
 * personalidad e idioma configurables. Detecta intención de cierre y genera
 * un resumen listo para prellenar un mensaje de WhatsApp hacia el negocio.
 */
import { ai } from '@/ai/genkit';
import {
  AiChatbotInputSchema,
  AiChatbotOutputSchema,
  AiChatbotPromptInputSchema,
  type AiChatbotInput,
  type AiChatbotOutput,
} from './schemas';

export async function aiChatbot(input: AiChatbotInput): Promise<AiChatbotOutput> {
  return aiChatbotFlow(input);
}

const PERSONALITY_INSTRUCTIONS: Record<string, string> = {
  profesional: 'Tono profesional, claro y cortés. Directo al grano, sin informalidades.',
  entusiasta: 'Tono cálido, positivo y enérgico. Usa exclamaciones con moderación para transmitir entusiasmo genuino.',
  divertido: 'Tono relajado, cercano y con un toque de humor ligero, sin perder el respeto ni la utilidad de la respuesta.',
  formal: 'Tono formal y protocolar. Evita contracciones informales.',
  ventas: 'Tono persuasivo y orientado a cerrar la venta: destaca beneficios, genera urgencia legítima (ej. disponibilidad limitada) y siempre invita a dar el siguiente paso. Nunca inventes datos ni presiones con información falsa.',
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  es: 'Responde siempre en español.',
  en: 'Always respond in English, even if the knowledge base is written in Spanish — translate the relevant information.',
};

const aiChatbotPrompt = ai.definePrompt({
  name: 'aiDynamicAssistantPrompt',
  input: { schema: AiChatbotPromptInputSchema },
  output: { schema: AiChatbotOutputSchema },
  prompt: `Eres el asistente virtual de "{{businessName}}". Respondes preguntas de clientes usando EXCLUSIVAMENTE la información de la "Base de Conocimiento" de abajo. Si no sabes algo porque no está en la base de conocimiento, dilo honestamente y sugiere que el cliente contacte directamente al negocio.

**Estilo de personalidad a seguir:** {{personalityInstruction}}
**Idioma:** {{languageInstruction}}

**Base de Conocimiento (Acerca de {{businessName}}):**
---
{{{knowledge}}}
---

**Memoria Conversacional:**
* Usa SIEMPRE el "Historial de conversación" para recordar lo que el usuario ya dijo. No repitas preguntas ya respondidas.

**Tu función como filtro de clientes (MUY IMPORTANTE):**
* Responde con normalidad preguntas sobre productos, servicios, precios, horarios o cualquier duda general usando la Base de Conocimiento.
* Si detectas que el cliente muestra una intención clara de cerrar (comprar, reservar, agendar o cotizar formalmente), marca "shouldEscalate" como verdadero, elige el "actionType" que mejor describa la acción ("reservar", "comprar", "agendar" o "cotizar"), y escribe un "closingSummary": una frase corta, en primera persona, desde el punto de vista del cliente, lista para prellenar un mensaje de WhatsApp al negocio (ejemplo: "Quiero reservar mesa para 4 personas el sábado a las 8pm."). No inventes datos que el cliente no haya dado — usa solo lo que él mencionó.
* Si es solo una pregunta informativa sin intención de cerrar, deja "shouldEscalate" como falso, "actionType" como "ninguna", y no llenes "closingSummary".

Historial de conversación (mensajes anteriores):
{{#if chatHistory}}
{{#each chatHistory}}
{{role}}: {{text}}
{{/each}}
{{else}}
(No hay mensajes anteriores en esta conversación)
{{/if}}

Mensaje actual del usuario (ID: {{{userId}}}):
{{{currentMessageText}}}
`,
});

const aiChatbotFlow = ai.defineFlow(
  {
    name: 'aiDynamicAssistantFlow',
    inputSchema: AiChatbotInputSchema,
    outputSchema: AiChatbotOutputSchema,
  },
  async (input): Promise<AiChatbotOutput> => {
    try {
      const personality = input.personality ?? 'profesional';
      const language = input.language ?? 'es';
      const personalityInstruction =
        PERSONALITY_INSTRUCTIONS[personality] ?? PERSONALITY_INSTRUCTIONS.profesional;
      const languageInstruction =
        LANGUAGE_INSTRUCTIONS[language] ?? LANGUAGE_INSTRUCTIONS.es;

      const { output } = await aiChatbotPrompt({
        ...input,
        personalityInstruction,
        languageInstruction,
      });

      if (output && typeof output.response === 'string') {
        return output;
      }

      if (output) {
        console.warn('AI chatbot output was not in the expected format:', output);
      }
      return {
        response: 'Lo siento, tuve un problema al procesar tu solicitud. Por favor, intenta de nuevo.',
      };
    } catch (error) {
      console.error('Error in aiChatbotFlow:', error);
      return {
        response: 'Lo siento, encontré un error interno. Por favor, inténtalo de nuevo más tarde.',
      };
    }
  }
);
