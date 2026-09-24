/**
 * Detección de intención de compra/reserva basada en reglas simples y auditables.
 * No usa IA: es barata, determinista y fácil de ajustar.
 */

/**
 * Palabras clave (sin acentos). Cada entrada es un fragmento de regex que se busca
 * al inicio de una palabra. Frases literales funcionan tal cual.
 */
export const PURCHASE_KEYWORDS: string[] = [
  'compr(?!en[ds])', // comprar, compro, compra (excluye comprender/comprensible)
  'reserv', // reservar, reserva, reservación
  'agend', // agendar, agenda
  'apart', // apartar, aparto, apartado
  'cotiz', // cotizar, cotización
  'pedid', // pedido
  'ordenar', // ordenar (no "orden" suelto, para evitar "en orden")
  'contrat', // contratar
  'adquir', // adquirir
  'encarg', // encargar
  'lo quiero',
  'la quiero',
  'los quiero',
  'las quiero',
  'me lo llevo',
  'me la llevo',
  'quiero uno',
  'quiero una',
  'hacer una cita',
  'sacar cita',
  'como pago',
  'formas de pago',
  'metodos de pago',
  'transferencia',
  'deposito',
];

/** Minúsculas y sin acentos, para comparar de forma robusta. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const PATTERNS = PURCHASE_KEYWORDS.map((k) => new RegExp(`(^|[^a-z])${k}`));

/** Devuelve true si el mensaje muestra intención de comprar, reservar, agendar, etc. */
export function detectPurchaseIntent(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized) return false;
  return PATTERNS.some((re) => re.test(normalized));
}
