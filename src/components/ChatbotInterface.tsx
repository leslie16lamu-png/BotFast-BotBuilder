'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Loader2, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { aiChatbot } from '@/ai/flows/chatbotFlow';
import type { ChatMessage, Personality } from '@/ai/flows/schemas';
import { useToast } from '@/hooks/use-toast';

type DisplayMessage = ChatMessage & { escalate?: boolean };

interface ChatbotInterfaceProps {
  businessName: string;
  knowledgeBase: string;
  isPreview?: boolean;
  logoUrl?: string | null;
  personality?: Personality;
}

export function ChatbotInterface({
  businessName,
  knowledgeBase,
  isPreview = false,
  logoUrl,
  personality,
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
      });

      const assistantMessage: DisplayMessage = {
        role: 'assistant',
        text: result.response,
        escalate: result.shouldEscalate,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling AI chatbot:', error);
      toast({
        title: 'Error de Comunicación',
        description:
          'No se pudo obtener una respuesta del asistente. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isPreview) {
      setMessages([
        {
          role: 'assistant',
          text: `¡Hola! Soy el asistente virtual de ${businessName || 'tu negocio'}. ¿En qué puedo ayudarte hoy?`,
        },
      ]);
    }
  }, [isPreview, businessName]);

  useEffect(() => {
    if (!isPreview && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          text: `Este es un chat de prueba con el asistente de ${businessName || 'tu negocio'}. ¡Hazme una pregunta!`,
        },
      ]);
    }
  }, [isPreview, businessName, messages.length]);

  return (
    <div className="h-[70vh] flex flex-col bg-card border rounded-lg shadow-lg">
      <div className="flex items-center p-3 border-b">
        <Avatar className="w-10 h-10">
          {logoUrl ? (
            <AvatarImage src={logoUrl} alt={`${businessName} logo`} />
          ) : null}
          <AvatarFallback className="bg-primary/20 text-primary">
            <Bot className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <p className="text-sm font-semibold">{businessName || 'Asistente Virtual'}</p>
          <p className="text-xs text-green-500">En línea</p>
        </div>
      </div>
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'items-end'}`}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="w-8 h-8">
                    {logoUrl ? <AvatarImage src={logoUrl} /> : null}
                    <AvatarFallback className="bg-primary/20 text-primary">
                      <Bot className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg p-3 max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  <p>{msg.text}</p>
                </div>
                {msg.role === 'user' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              {msg.escalate && (
                <span className="ml-11 flex items-center gap-1 text-xs font-medium text-orange-500">
                  <Flame className="w-3 h-3" /> Cliente listo para cerrar — se
                  escalaría al dueño
                </span>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/20 text-primary">
                  <Bot className="w-5 h-5" />
                </AvatarFallback>
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
          placeholder={
            isPreview
              ? 'La interacción está desactivada en la previsualización.'
              : 'Escribe tu mensaje...'
          }
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
