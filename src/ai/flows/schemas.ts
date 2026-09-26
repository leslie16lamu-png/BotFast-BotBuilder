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

// Personalidades disponibles para el tono del chatbot.
export const PersonalitySchema = z.enum([
  'profesional',
  'entusiasta',
  'divertido',
  'formal',
  'ventas',
]);
export type Personality = z.infer<typeof PersonalitySchema>;

// Idioma en el que debe responder el chatbot. Se puede ampliar con más
// códigos más adelante sin romper lo existente.
export const LanguageSchema = z.enum(['es', 'en']);
export type Language = z.infer<typeof LanguageSchema>;

// Tipo de acción de cierre detectada. "ninguna" = no hubo intención de cierre.
export const ActionTypeSchema = z.enum([
  'reservar',
  'comprar',
  'agendar',
  'cotizar',
  'ninguna',
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const SocialLinksSchema = z.object({
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  website: z.string().optional(),
});
export type SocialLinks = z.infer<typeof SocialLinksSchema>;

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
  language: LanguageSchema
    .optional()
    .describe('El idioma en el que debe responder el chatbot.'),
});
export type AiChatbotInput = z.infer<typeof AiChatbotInputSchema>;

export const AiChatbotPromptInputSchema = AiChatbotInputSchema.extend({
  personalityInstruction: z
    .string()
    .describe('Instrucción de tono ya resuelta a partir de personality.'),
  languageInstruction: z
    .string()
    .describe('Instrucción de idioma ya resuelta a partir de language.'),
});
export type AiChatbotPromptInput = z.infer<typeof AiChatbotPromptInputSchema>;

export const AiChatbotOutputSchema = z.object({
  response: z.string().describe('La respuesta del chatbot.'),
  shouldEscalate: z
    .boolean()
    .optional()
    .describe(
      'Verdadero si el cliente mostró intención de comprar, reservar, agendar o cotizar y debe ser dirigido al dueño del negocio.'
    ),
  actionType: ActionTypeSchema
    .optional()
    .describe('El tipo de acción de cierre detectada, solo si shouldEscalate es verdadero.'),
  closingSummary: z
    .string()
    .optional()
    .describe(
      'Resumen breve, en primera persona y desde el punto de vista del cliente, de lo que quiere hacer. Se usa para prellenar un mensaje de WhatsApp. Solo se llena si shouldEscalate es verdadero. Ejemplo: "Quiero reservar mesa para 4 personas el sábado a las 8pm."'
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
