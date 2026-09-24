/**
 * Conector de solo lectura a Google Sheets usando una cuenta de servicio.
 * Guarda las filas en memoria por 5 minutos para no consultar la API en cada mensaje.
 */
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { requireEnv } from '../config.js';

export type SheetRow = Record<string, string>;
/** Una hoja (pestaña) del documento: título + filas con los encabezados como claves. */
export interface SheetTab {
  title: string;
  rows: SheetRow[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; data: SheetTab[] }>();

function getAuth(): JWT {
  // Las llaves privadas suelen guardarse en env vars con "\n" escapados.
  const key = requireEnv('GOOGLE_SERVICE_ACCOUNT_KEY').replace(/\\n/g, '\n');
  return new JWT({
    email: requireEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

/** Lee todas las pestañas del Sheet (usa caché de 5 min). */
export async function readSheet(sheetId: string): Promise<SheetTab[]> {
  const cached = cache.get(sheetId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const doc = new GoogleSpreadsheet(sheetId, getAuth());
  await doc.loadInfo();

  const data: SheetTab[] = [];
  for (const sheet of doc.sheetsByIndex) {
    const rows = await sheet.getRows();
    data.push({
      title: sheet.title,
      rows: rows.map((r) => r.toObject() as SheetRow),
    });
  }

  cache.set(sheetId, { expiresAt: Date.now() + CACHE_TTL_MS, data });
  return data;
}

/** Borra la caché (útil en pruebas o para forzar una recarga). */
export function clearSheetCache(sheetId?: string): void {
  if (sheetId) cache.delete(sheetId);
  else cache.clear();
}

/** Convierte las pestañas en texto plano para usarlo como base de conocimiento. */
export function sheetToKnowledge(tabs: SheetTab[]): string {
  return tabs
    .map((tab) => {
      const lines = tab.rows.map((row) =>
        Object.entries(row)
          .filter(([, v]) => v !== undefined && String(v).trim() !== '')
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ')
      );
      return `## ${tab.title}\n${lines.join('\n')}`;
    })
    .join('\n\n');
}

/**
 * Extrae los datos de contacto. Convención: una pestaña llamada "Contacto"
 * con columnas "campo" y "valor" (p. ej. telefono / whatsapp / correo).
 */
export function extractContact(tabs: SheetTab[]): string | null {
  const tab = tabs.find((t) => t.title.trim().toLowerCase() === 'contacto');
  if (!tab || tab.rows.length === 0) return null;
  return tab.rows
    .map((r) => {
      const campo = r.campo ?? r.Campo ?? Object.values(r)[0];
      const valor = r.valor ?? r.Valor ?? Object.values(r)[1];
      return campo && valor ? `• ${campo}: ${valor}` : null;
    })
    .filter(Boolean)
    .join('\n');
}
