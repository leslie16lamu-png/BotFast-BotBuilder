'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Loader2, MessageCircle, Facebook, Instagram, Globe, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { aiChatbot } from '@/ai/flows/chatbotFlow';
import type { ChatMessage, Personality, Language, ActionType, SocialLinks } from '@/ai/flows/schemas';
import { useToast } from '@/hooks/use-toast';

type DisplayMessage = ChatMessage & {
  escalate?: boolean;
  actionType?: ActionType;
  closingSummary?: string;
};

interface ChatbotInterfaceProps {
  businessName: string;
  knowledgeBase: string;
  isPreview?: boolean;
  logoUrl?: string | null;
  personality?: Personality;
  language?: Language;
  whatsappNumber?: string;
  socialLinks?: SocialLinks;
}

const ACTION_LABELS: Record<string, string> = {
  reservar: 'Reservar por WhatsApp',
  comprar: 'Comprar por WhatsApp',
  agendar: 'Agendar por WhatsApp',
  cotizar: 'Pedir cotización por WhatsApp',
};

function sanitizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

function isLikelyUrl(value?: string): value is string {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

function buildWhatsAppLink(rawPhone: string | undefined, message: string): string | null {
  if (!rawPhone) return null;
  const digits = sanitizePhone(rawPhone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function ChatbotInterface({
  businessName,
  knowledgeBase,
  isPreview = false,
  logoUrl,
  personality,
  language,
  whatsappNumber,
  socialLinks,
}: ChatbotInterfaceProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const userId = 'test-user';

  const stableKnowledgeBase = useRef(knowledgeBase);
  useEffect(() => {
    stableKnowledgeBase.current = knowledgeBase;
  }, [knowledgeBase]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isPreview) return;

    const userMessage: DisplayMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = messages.slice(-10);

      const result = await aiChatbot({
        userId,
        businessName,
        knowledge: stableKnowledgeBase.current,
        currentMessageText: input,
        chatHistory,
        personality,
        language,
      });

      const assistantMessage: DisplayMessage = {
        role: 'assistant',
        text: result.response,
        escalate: result.shouldEscalate,
        actionType: result.actionType,
        closingSummary: result.closingSummary,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling AI chatbot:', error);
      toast({
        title: 'Error de Comunicación',
        description: 'No se pudo obtener una respuesta del asistente. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isPreview) {
      setMessages([
        { role: 'assistant', text: `¡Hola! Soy el asistente virtual de ${businessName || 'tu negocio'}. ¿En qué puedo ayudarte hoy?` },
      ]);
    }
  }, [isPreview, businessName]);

  useEffect(() => {
    if (!isPreview && messages.length === 0) {
      setMessages([
        { role: 'assistant', text: `Este es un chat de prueba con el asistente de ${businessName || 'tu negocio'}. ¡Hazme una pregunta!` },
      ]);
    }
  }, [isPreview, businessName, messages.length]);

  const socialButtons = [
    { key: 'facebook', url: socialLinks?.facebook, icon: Facebook, label: 'Facebook' },
    { key: 'instagram', url: socialLinks?.instagram, icon: Instagram, label: 'Instagram' },
    { key: 'tiktok', url: socialLinks?.tiktok, icon: Music2, label: 'TikTok' },
    { key: 'website', url: socialLinks?.website, icon: Globe, label: 'Sitio web' },
  ].filter((s) => isLikelyUrl(s.url));

  return (
    <div className="h-[70vh] flex flex-col bg-card border rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-3 border-b gap-2">
        <div className="flex items-center min-w-0">
          <Avatar className="w-10 h-10 shrink-0">
            {logoUrl ? <AvatarImage src={logoUrl} alt={`${businessName} logo`} /> : null}
            <AvatarFallback className="bg-primary/20 text-primary">
              <Bot className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 min-w-0">
            <p className="text-sm font-semibold truncate">{businessName || 'Asistente Virtual'}</p>
            <p className="text-xs text-green-500">En línea</p>
          </div>
        </div>
        {socialButtons.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {socialButtons.map(({ key, url, icon: Icon, label }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        )}
      </div>
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const waLink = msg.escalate
              ? buildWhatsAppLink(whatsappNumber, msg.closingSummary || msg.text)
              : null;
            const actionLabel = (msg.actionType && ACTION_LABELS[msg.actionType]) || 'Continuar por WhatsApp';

            return (
              <div key={index} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'items-end'}`}>
                  {msg.role === 'assistant' && (
                    <Avatar className="w-8 h-8">
                      {logoUrl ? <AvatarImage src={logoUrl} /> : null}
                      <AvatarFallback className="bg-primary/20 text-primary">
                        <Bot className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`rounded-lg p-3 max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p>{msg.text}</p>
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
                {msg.escalate && (
                  waLink ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-11 inline-flex items-center gap-1.5 text-xs font-medium bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-full transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> {actionLabel}
                    </a>
                  ) : (
                    <span className="ml-11 text-xs font-medium text-orange-500">
                      Cliente listo para cerrar — falta configurar el WhatsApp del negocio
                    </span>
                  )
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/20 text-primary"><Bot className="w-5 h-5" /></AvatarFallback>
              </Avatar>
              <div className="rounded-lg p-3 max-w-lg bg-muted flex items-center">
                <Loader2 className="animate-spin h-5 w-5" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isPreview ? 'La interacción está desactivada en la previsualización.' : 'Escribe tu mensaje...'}
          disabled={isLoading || isPreview}
          autoComplete="off"
        />
        <Button type="submit" disabled={isLoading || !input.trim() || isPreview}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
      <footer className="text-center text-xs text-muted-foreground p-2 border-t">
        Creado con <Bot className="inline w-3 h-3 text-primary" /> OBNKodeX
      </footer>
    </div>
  );
}
