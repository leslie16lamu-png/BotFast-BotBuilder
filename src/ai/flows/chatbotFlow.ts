'use server';
/**
 * @fileOverview Asistente de IA genérico para cualquier tipo de negocio, con
 * personalidad configurable y detección de intención de compra/reserva para
 * escalar la conversación al dueño del negocio.
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
  profesional:
    'Tono profesional, claro y cortés. Directo al grano, sin informalidades.',
  entusiasta:
    'Tono cálido, positivo y enérgico. Usa exclamaciones con moderación para transmitir entusiasmo genuino.',
  divertido:
    'Tono relajado, cercano y con un toque de humor ligero, sin perder el respeto ni la utilidad de la respuesta.',
  formal:
    'Tono formal y protocolar. Evita contracciones informales.',
  ventas:
    'Tono persuasivo y orientado a cerrar la venta: destaca beneficios, genera urgencia legítima (ej. disponibilidad limitada) y siempre invita a dar el siguiente paso. Nunca inventes datos ni presiones con información falsa.',
};

const aiChatbotPrompt = ai.definePrompt({
  name: 'aiDynamicAssistantPrompt',
  input: { schema: AiChatbotPromptInputSchema },
  output: { schema: AiChatbotOutputSchema },
  prompt: `Eres el asistente virtual de "{{businessName}}". Respondes preguntas de clientes usando EXCLUSIVAMENTE la información de la "Base de Conocimiento" de abajo. Si no sabes algo porque no está en la base de conocimiento, dilo honestamente y sugiere que el cliente contacte directamente al negocio.

**Estilo de personalidad a seguir:** {{personalityInstruction}}

**Base de Conocimiento (Acerca de {{businessName}}):**
---
{{{knowledge}}}
---

**Memoria Conversacional:**
* Usa SIEMPRE el "Historial de conversación" para recordar lo que el usuario ya dijo. No repitas preguntas ya respondidas.

**Tu función como filtro de clientes (MUY IMPORTANTE):**
* Responde con normalidad preguntas sobre productos, servicios, precios, horarios o cualquier duda general usando la Base de Conocimiento.
* Si detectas que el cliente muestra una intención clara de COMPRAR, RESERVAR, AGENDAR O APARTAR algo, marca "shouldEscalate" como verdadero y, en tu mensaje, dirígelo amablemente a contactar directamente al negocio usando los datos de contacto de la Base de Conocimiento (teléfono, WhatsApp o correo). No inventes procesos de pago ni de reserva que no estén descritos en la Base de Conocimiento.
* Si es solo una pregunta informativa sin intención de cerrar, deja "shouldEscalate" como falso.

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
      const personalityInstruction =
        PERSONALITY_INSTRUCTIONS[personality] ?? PERSONALITY_INSTRUCTIONS.profesional;

      const { output } = await aiChatbotPrompt({
        ...input,
        personalityInstruction,
      });

      if (output && typeof output.response === 'string') {
        return output;
      }

      if (output) {
        console.warn('AI chatbot output was not in the expected format:', output);
      }
      return {
        response:
          'Lo siento, tuve un problema al procesar tu solicitud. Por favor, intenta de nuevo.',
      };
    } catch (error) {
      console.error('Error in aiChatbotFlow:', error);
      return {
        response:
          'Lo siento, encontré un error interno. Por favor, inténtalo de nuevo más tarde.',
      };
    }
  }
);
