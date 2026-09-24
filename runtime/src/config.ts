import 'dotenv/config';

/** Lee una variable de entorno obligatoria; falla temprano si falta. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa runtime/.env.example.`);
  }
  return value;
}

export const PORT = Number(process.env.PORT ?? 3008);
