
'use client';

import { useState, useRef, useCallback, useId, useEffect } from 'react';
import { Bot, User, Send, Upload, Settings, BrainCircuit, Loader2, Wand2, Palette, Monitor, Download, RefreshCw, MessageSquarePlus, Image as ImageIcon, Sun, Moon, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { useTheme } from "next-themes";
import { refineKnowledgeFlow } from '@/ai/flows/refineKnowledgeFlow';
import { imageToTextFlow } from '@/ai/flows/imageToTextFlow';
import { analyzeLogoFlow } from '@/ai/flows/analyzeLogoFlow';
import { useToast } from "@/hooks/use-toast";
import { ChatbotInterface } from '@/components/ChatbotInterface';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { Personality, Language, SocialLinks } from '@/ai/flows/schemas';


if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

const defaultPalette = [
    { name: 'Naranja', value: '25 95% 53%' },
    { name: 'Azul', value: '217 91% 60%' },
    { name: 'Verde', value: '142 71% 45%' },
    { name: 'Rosa', value: '340 82% 52%' },
    { name: 'Morado', value: '262 84% 58%' },
];

const personalityOptions: { value: Personality; label: string; description: string }[] = [
  { value: 'profesional', label: 'Profesional', description: 'Claro, cortés y directo.' },
  { value: 'entusiasta', label: 'Entusiasta', description: 'Cálido y positivo.' },
  { value: 'divertido', label: 'Divertido', description: 'Cercano, con humor ligero.' },
  { value: 'formal', label: 'Formal', description: 'Protocolar y serio.' },
  { value: 'ventas', label: 'Experto en Ventas', description: 'Persuasivo, orientado a cerrar.' },
];

const languageOptions: { value: Language; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

export default function Home() {
  const [knowledge, setKnowledge] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [primaryColor, setPrimaryColor] = useState('25 95% 53%');
  const [feedbackKnowledge, setFeedbackKnowledge] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [colorPalette, setColorPalette] = useState(defaultPalette);
  const [personality, setPersonality] = useState<Personality>('profesional');
  const [language, setLanguage] = useState<Language>('es');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [completedBots, setCompletedBots] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const chatbotInterfaceId = useId();
  const { setTheme } = useTheme();

  const isNextStepDisabled = !businessName.trim() || !knowledge.trim();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    let textContent = '';

    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        textContent = await new Promise<string>((resolve, reject) => {
            reader.onload = async () => {
                try {
                    const base64Data = reader.result as string;
                    const extractedText = await imageToTextFlow({ photoDataUri: base64Data });
                    resolve(extractedText);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
        });
      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: new Uint8Array(arrayBuffer)}).promise;
        const numPages = pdf.numPages;
        let fullText = '';
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
        }
        textContent = fullText;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        textContent = result.value;
      } else if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
        textContent = await file.text();
      } else {
        toast({
          title: "Tipo de archivo no soportado",
          description: `El archivo "${file.name}" no es un documento de texto, PDF, Word o imagen válido.`,
          variant: "destructive",
        });
        setIsProcessingFile(false);
        return;
      }
      setKnowledge(prev => prev ? `${prev}\n\n--- Contenido de ${file.name} ---\n${textContent}` : `--- Contenido de ${file.name} ---\n${textContent}`);
      toast({
        title: "Archivo Procesado",
        description: `El contenido de "${file.name}" ha sido añadido a la base de conocimiento.`,
      });
    } catch (error: any) {
      console.error('Error processing file:', error);
      let description = `No se pudo procesar el archivo "${file.name}".`;
      if (typeof error.message === 'string' && (error.message.includes('503') || error.message.includes('500') || error.message.includes('Internal Server Error'))) {
          description = "El servicio de IA no está disponible o está sobrecargado en este momento. Por favor, inténtalo de nuevo más tarde.";
      }
       toast({
          title: "Error al Procesar Archivo",
          description: description,
          variant: "destructive",
        });
    } finally {
      setIsProcessingFile(false);
       if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleLogoUploadClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast({ title: "Archivo inválido", description: "Por favor, selecciona un archivo de imagen.", variant: "destructive" });
      return;
    };
    
    setIsExtractingColors(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      setLogoUrl(base64Data);
      
      try {
        const result = await analyzeLogoFlow({ photoDataUri: base64Data });
        if (result.colors && result.colors.length > 0) {
            const newPalette = result.colors.map(color => ({ name: color, value: hexToHsl(color) }));
            setColorPalette(newPalette);
            // set primary color to first color of palette
            if (newPalette.length > 0) {
              applyColorTheme(newPalette[0].value);
            }
            toast({ title: "Paleta de colores extraída", description: "Se ha generado una nueva paleta a partir de tu logo."});
        } else {
            setColorPalette(defaultPalette);
            toast({ title: "No se pudieron extraer colores", description: "Usando la paleta por defecto.", variant: "default" });
        }
      } catch (error) {
        console.error("Error extracting colors:", error);
        setColorPalette(defaultPalette);
        toast({ title: "Error al extraer colores", description: "Ocurrió un error al analizar el logo. Usando la paleta por defecto.", variant: "destructive" });
      } finally {
        setIsExtractingColors(false);
      }
    };
  };

  const hexToHsl = (hex: string): string => {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length == 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max != min) {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    return `${h} ${s}% ${l}%`;
  };


  const handleRefineKnowledge = async () => {
    if (!refineInput.trim()) return;

    setIsRefining(true);
    try {
      const result = await refineKnowledgeFlow({ rawText: refineInput });
      setKnowledge(prev => prev ? `${prev}\n\n${result.refinedText}` : result.refinedText);
      setRefineInput('');
      toast({
        title: "Base de Conocimiento Refinada",
        description: "El texto ha sido mejorado y añadido a la base de conocimiento.",
      });
    } catch (error) {
      console.error('Error refining knowledge:', error);
      toast({
        title: "Error al Refinar",
        description: "No se pudo procesar el texto. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsRefining(false);
    }
  };
  
  const handleProceed = () => {
     if (isNextStepDisabled) {
        toast({
          title: "Información Requerida",
          description: "Por favor, ingresa el nombre del negocio y la base de conocimiento antes de continuar.",
          variant: "destructive",
        });
        return;
      }
      if(activeTab === 'create') setActiveTab('customize');
      else if(activeTab === 'customize') setActiveTab('test');
  };
  
  const handleFeedbackRefresh = useCallback(() => {
    if (!feedbackKnowledge.trim()) {
      toast({ title: "Sin retroalimentación", description: "El cuadro de texto está vacío."});
      return;
    }
    const fullKnowledge = `--- INFORMACIÓN ADICIONAL PROPORCIONADA DURANTE LA PRUEBA ---\n${feedbackKnowledge}`;
    setKnowledge(prev => `${prev}\n\n${fullKnowledge}`);
    setFeedbackKnowledge('');
    toast({
      title: "Memoria Refrescada",
      description: "El chatbot ha incorporado tu retroalimentación.",
    });
  }, [feedbackKnowledge, toast]);
  
  const fullKnowledgeBase = `
    ${knowledge}

    --- Información de Contacto Adicional ---
    Teléfono: ${contactPhone || 'No proporcionado'}
    WhatsApp: ${contactWhatsapp || 'No proporcionado'}
    Email de Contacto: ${contactEmail || 'No proporcionado'}
  `;

  const socialLinks: SocialLinks = {
    facebook: facebookUrl || undefined,
    instagram: instagramUrl || undefined,
    tiktok: tiktokUrl || undefined,
    website: websiteUrl || undefined,
  };
  
  const applyColorTheme = (color: string) => {
    setPrimaryColor(color);
  };
  
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-hsl', primaryColor);
  }, [primaryColor]);

  const handleExport = (type: 'link' | 'file') => {
    toast({
      title: `Exportación de ${type === 'link' ? 'Link' : 'Archivo'}`,
      description: "Esta funcionalidad está en desarrollo y estará disponible pronto.",
      variant: "default",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">IA autónoma</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Apariencia</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                <span>Claro</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                <span>Oscuro</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Laptop className="mr-2 h-4 w-4" />
                <span>Sistema</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
               <DropdownMenuLabel>Estadísticas</DropdownMenuLabel>
                <DropdownMenuItem disabled>
                    <span>Chatbots Creados: {completedBots}</span>
                </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>Verificar Actualizaciones</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Ayuda
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Creado por OBNKodeX
              </DropdownMenuLabel>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
       <main className="flex-grow container mx-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="create"><BrainCircuit className="mr-2"/>1. Entrenar</TabsTrigger>
                <TabsTrigger value="customize" disabled={isNextStepDisabled}><Palette className="mr-2"/>2. Personalizar</TabsTrigger>
                <TabsTrigger value="test" disabled={isNextStepDisabled}><Monitor className="mr-2"/>3. Probar</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="mt-6">
                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-6">
                        <Card className="flex-grow">
                            <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BrainCircuit className="text-primary" />
                                Entrena a tu Asistente
                            </CardTitle>
                            <CardDescription>
                                Proporciona la información con la que tu chatbot atenderá a los clientes.
                            </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="businessName" className="font-medium">Nombre del Negocio</label>
                                    <Input id="businessName" placeholder="Ej: Ferretería 'El Martillo Feliz'" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="knowledge" className="font-medium">Base de Conocimiento</label>
                                    <Textarea id="knowledge" placeholder="Pega aquí la información de tu negocio, sube un archivo o usa el asistente de la derecha para refinarla." className="h-48" value={knowledge} onChange={(e) => setKnowledge(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-medium">Información Adicional (Opcional)</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <Input placeholder="Teléfono de contacto" value={contactPhone} onChange={e => setContactPhone(e.target.value)}/>
                                        <Input placeholder="WhatsApp" value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)}/>
                                        <Input placeholder="Email de contacto" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}/>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                        <Input placeholder="Link de Facebook (opcional)" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)}/>
                                        <Input placeholder="Link de Instagram (opcional)" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}/>
                                        <Input placeholder="Link de TikTok (opcional)" value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)}/>
                                        <Input placeholder="Sitio web (opcional)" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}/>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="w-full" onClick={handleUploadClick} disabled={isProcessingFile}>
                                    {isProcessingFile ? <Loader2 className="mr-2 animate-spin" /> : <Upload className="mr-2" />}
                                    Subir Archivo
                                    </Button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.md,.pdf,.docx,image/*"/>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                     <div className="flex flex-col">
                        <Card className="flex flex-col flex-grow">
                            <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wand2 className="text-primary" />
                                Asistente de Creación
                            </CardTitle>
                            <CardDescription>Usa esta IA para refinar y estructurar la información para tu chatbot.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col">
                            <div className="space-y-2 flex-grow flex flex-col">
                                <label htmlFor="refineInput" className="font-medium">Borrador de Información</label>
                                <Textarea id="refineInput" placeholder="Escribe tus ideas, FAQs o descripción de servicios aquí. Luego, presiona 'Refinar' para que la IA lo mejore y lo agregue a la Base de Conocimiento." className="flex-grow h-72" value={refineInput} onChange={(e) => setRefineInput(e.target.value)} />
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Button className="w-full" onClick={handleRefineKnowledge} disabled={isRefining}>
                                {isRefining ? <Loader2 className="animate-spin" /> : <Wand2 />}
                                Refinar y Añadir
                                </Button>
                            </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="customize" className="mt-6">
                <div className="grid md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personalización Visual</CardTitle>
                            <CardDescription>Ajusta la apariencia de tu chatbot para que coincida con tu marca.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label className="font-medium">Logo del Negocio</label>
                                <div className="flex items-center gap-4">
                                  {logoUrl ? (
                                    <Image src={logoUrl} alt="Logo preview" width={64} height={64} className="rounded-lg object-contain bg-muted/30 p-1" />
                                  ) : (
                                    <div className="w-16 h-16 bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground">
                                        <ImageIcon/>
                                    </div>
                                  )}
                                  <Button variant="outline" onClick={handleLogoUploadClick} disabled={isExtractingColors}>
                                    {isExtractingColors ? <Loader2 className="mr-2 animate-spin"/> : <Upload className="mr-2"/>} 
                                    Subir Logo
                                  </Button>
                                  <input type="file" ref={logoInputRef} onChange={handleLogoChange} className="hidden" accept="image/png,image/jpeg,image/jpg,image/gif"/>
                                </div>
                             </div>
                            <div className="space-y-2">
                                <label className="font-medium">Color Principal</label>
                                 <div className="flex flex-wrap gap-3">
                                    {isExtractingColors ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin"/> Extrayendo colores...</div>
                                    ) : (
                                        colorPalette.map(color => (
                                            <button 
                                            key={color.name} 
                                            title={color.name}
                                            onClick={() => applyColorTheme(color.value)} 
                                            className={cn("h-10 w-10 rounded-full border-2 transition-all transform hover:scale-110 focus:outline-none", 
                                                primaryColor === color.value ? 'border-primary ring-2 ring-offset-2 ring-primary animate-ring-glow' : 'border-transparent'
                                            )} 
                                            style={{ backgroundColor: `hsl(${color.value})` }} 
                                            aria-label={color.name} 
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="font-medium">Personalidad del Asistente</label>
                                <div className="flex flex-wrap gap-2">
                                    {personalityOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            title={opt.description}
                                            onClick={() => setPersonality(opt.value)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-sm border transition-colors",
                                                personality === opt.value
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-transparent border-muted-foreground/30 hover:border-primary"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="font-medium">Idioma del Asistente</label>
                                <div className="flex flex-wrap gap-2">
                                    {languageOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setLanguage(opt.value)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-sm border transition-colors",
                                                language === opt.value
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-transparent border-muted-foreground/30 hover:border-primary"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                     <div className="flex flex-col items-center justify-center bg-muted/30 p-4 rounded-lg">
                        <CardTitle className="mb-4">Previsualización</CardTitle>
                        <div className="w-full max-w-sm">
                           <ChatbotInterface key={`${chatbotInterfaceId}-${primaryColor}`} businessName={businessName} knowledgeBase={fullKnowledgeBase} isPreview={true} logoUrl={logoUrl} personality={personality} language={language} whatsappNumber={contactWhatsapp} socialLinks={socialLinks}/>
                        </div>
                     </div>
                </div>
            </TabsContent>
            <TabsContent value="test" className="mt-6">
                 <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <Card>
                             <CardHeader>
                                <CardTitle>Prueba tu Asistente</CardTitle>
                                <CardDescription>Conversa con tu IA para asegurarte de que responde como esperas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChatbotInterface key={`${chatbotInterfaceId}-test`} businessName={businessName} knowledgeBase={fullKnowledgeBase} logoUrl={logoUrl} personality={personality} language={language} whatsappNumber={contactWhatsapp} socialLinks={socialLinks}/>
                            </CardContent>
                        </Card>
                    </div>
                    <div>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><MessageSquarePlus/>Retroalimentación en Vivo</CardTitle>
                                <CardDescription>Añade información a la base de conocimiento sin reiniciar la conversación.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Textarea 
                                    placeholder="Escribe aquí nueva información o correcciones..." 
                                    className="h-48"
                                    value={feedbackKnowledge}
                                    onChange={e => setFeedbackKnowledge(e.target.value)}
                                />
                                <Button className="w-full" onClick={handleFeedbackRefresh}>
                                    <RefreshCw className="mr-2"/>Refrescar Memoria
                                </Button>
                            </CardContent>
                        </Card>
                        <Card className="mt-8">
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Download/>Exportar</CardTitle>
                                <CardDescription>Obtén tu chatbot para usarlo donde quieras.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                               <Button className="w-full" variant="outline" onClick={() => handleExport('link')}>Obtener Link</Button>
                               <Button className="w-full" variant="outline" onClick={() => handleExport('file')}>Descargar Archivo</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-end">
            {activeTab !== 'test' && (
                <Button onClick={handleProceed} disabled={isNextStepDisabled}>
                    {activeTab === 'create' ? 'Siguiente: Personalizar' : 'Siguiente: Probar'}
                </Button>
            )}
        </div>
      </main>
    </div>
  );
}
