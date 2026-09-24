/**
 * @fileOverview Schemas and types for the chatbot flow.
 */
import { z } from 'zod';

// Chatbot Schemas
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Personalidades disponibles para el tono del chatbot. Son genéricas y
// aplican a cualquier tipo de negocio (no dependen de un giro en particular).
export const PersonalitySchema = z.enum([
  'profesional',
  'entusiasta',
  'divertido',
  'formal',
  'ventas',
]);
export type Personality = z.infer<typeof PersonalitySchema>;

export const AiChatbotInputSchema = z.object({
  userId: z.string().describe('El ID del usuario.'),
  currentMessageText: z.string().describe('El mensaje actual del usuario.'),
  chatHistory: z
    .array(ChatMessageSchema)
    .optional()
    .describe('El historial de la conversación.'),
  businessName: z
    .string()
    .describe('El nombre del negocio para el que actúa el chatbot.'),
  knowledge: z.string().describe('La base de conocimiento sobre el negocio.'),
  personality: PersonalitySchema
    .optional()
    .describe('El tono/personalidad con la que debe responder el chatbot.'),
});
export type AiChatbotInput = z.infer<typeof AiChatbotInputSchema>;

// Esquema interno usado solo por el prompt: extiende el input público con
// la instrucción de tono ya resuelta a partir de "personality".
export const AiChatbotPromptInputSchema = AiChatbotInputSchema.extend({
  personalityInstruction: z
    .string()
    .describe('Instrucción de tono ya resuelta a partir de personality.'),
});
export type AiChatbotPromptInput = z.infer<typeof AiChatbotPromptInputSchema>;

export const AiChatbotOutputSchema = z.object({
  response: z.string().describe('La respuesta del chatbot.'),
  shouldEscalate: z
    .boolean()
    .optional()
    .describe(
      'Verdadero si el cliente mostró intención de comprar, reservar o agendar y debe ser dirigido al dueño del negocio.'
    ),
});
export type AiChatbotOutput = z.infer<typeof AiChatbotOutputSchema>;

// Refine Knowledge Schemas
export const RefineKnowledgeInputSchema = z.object({
  rawText: z.string().describe('The raw, unstructured text to be refined.'),
});
export type RefineKnowledgeInput = z.infer<typeof RefineKnowledgeInputSchema>;

export const RefineKnowledgeOutputSchema = z.object({
  refinedText: z
    .string()
    .describe(
      'The refined, well-structured text, formatted nicely for a knowledge base. Use markdown like headings, lists, and bold text.'
    ),
});
export type RefineKnowledgeOutput = z.infer<
  typeof RefineKnowledgeOutputSchema
>;
