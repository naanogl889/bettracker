import { Bet } from '../types/bets';
import { SAMPLE_BETS } from '../data/sampleBets';

const STORAGE_KEY = 'bettracker_mvp_bets_v1';
const SUPABASE_CONFIG_KEY = 'bettracker_supabase_config_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

export const SUPABASE_SQL_SCHEMA = `-- =========================================================
-- SQL PARA CREAR LA TABLA EN SUPABASE (PostgreSQL)
-- Herramienta Personal Privada - Sincronización entre dispositivos
-- =========================================================

CREATE TABLE IF NOT EXISTS public.bets (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stake NUMERIC NOT NULL,
  odds NUMERIC NOT NULL,
  bookmaker TEXT NOT NULL,
  event TEXT,
  sport TEXT,
  event_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  profit NUMERIC NOT NULL DEFAULT 0,
  notes TEXT
);

-- Crear índice para mejorar consultas por fecha y estado
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON public.bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_bookmaker ON public.bets(bookmaker);

-- Políticas de seguridad (Row Level Security - uso personal privado)
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso total al propietario"
  ON public.bets
  FOR ALL
  USING (true)
  WITH CHECK (true);
`;

/**
 * Obtiene las apuestas almacenadas en localStorage o inicializa con apuestas de ejemplo
 */
export function getStoredBets(): Bet[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_BETS));
      return SAMPLE_BETS;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return SAMPLE_BETS;
  } catch (err) {
    console.error('Error cargando apuestas de localStorage:', err);
    return SAMPLE_BETS;
  }
}

/**
 * Guarda las apuestas en localStorage (caché local rápida)
 */
export function saveStoredBets(bets: Bet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
  } catch (err) {
    console.error('Error guardando apuestas en localStorage:', err);
  }
}

/**
 * Restaura las apuestas de ejemplo
 */
export function restoreSampleBets(): Bet[] {
  saveStoredBets(SAMPLE_BETS);
  return SAMPLE_BETS;
}

/**
 * Limpia todas las apuestas (empezar desde cero)
 */
export function clearAllBets(): Bet[] {
  saveStoredBets([]);
  return [];
}

/**
 * Obtiene la configuración de Supabase (con soporte para variables de entorno VITE_)
 */
export function getSupabaseConfig(): SupabaseConfig {
  try {
    const data = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error obteniendo config Supabase:', err);
  }

  // Fallback automático a variables de entorno si están configuradas
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  const hasEnv = Boolean(envUrl && envKey);

  return {
    url: envUrl,
    anonKey: envKey,
    enabled: hasEnv,
  };
}

/**
 * Guarda la configuración de Supabase
 */
export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error guardando config Supabase:', err);
  }
}

/**
 * 1. LEER APUESTAS DE SUPABASE (Fuente primaria de datos online)
 */
export async function fetchBetsFromSupabase(
  config: SupabaseConfig
): Promise<Bet[] | null> {
  if (!config.enabled || !config.url || !config.anonKey) {
    return null;
  }
  try {
    const cleanUrl = config.url.replace(/\/$/, '');
    const endpoint = `${cleanUrl}/rest/v1/bets?select=*&order=created_at.desc`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    if (!response.ok) {
      console.warn('Error leyendo de Supabase:', await response.text());
      return null;
    }

    const data: Bet[] = await response.json();
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.warn('Error al conectar con Supabase en fetch:', err);
    return null;
  }
}

/**
 * 2. CREAR / UPSERT APUESTA EN SUPABASE
 */
export async function upsertBetInSupabase(
  bet: Bet,
  config: SupabaseConfig
): Promise<boolean> {
  if (!config.enabled || !config.url || !config.anonKey) {
    return false;
  }
  try {
    const cleanUrl = config.url.replace(/\/$/, '');
    const endpoint = `${cleanUrl}/rest/v1/bets`;

    const payload = {
      ...bet,
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('Fallo upsert con Supabase:', await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error al conectar con Supabase (upsert):', err);
    return false;
  }
}

/**
 * Compatibilidad con función anterior
 */
export async function syncBetWithSupabase(
  bet: Bet,
  config: SupabaseConfig
): Promise<boolean> {
  return upsertBetInSupabase(bet, config);
}

/**
 * 3. ACTUALIZAR APUESTA EN SUPABASE (Resolver / Editar)
 */
export async function updateBetInSupabase(
  id: string,
  partial: Partial<Bet>,
  config: SupabaseConfig
): Promise<boolean> {
  if (!config.enabled || !config.url || !config.anonKey) {
    return false;
  }
  try {
    const cleanUrl = config.url.replace(/\/$/, '');
    const endpoint = `${cleanUrl}/rest/v1/bets?id=eq.${encodeURIComponent(id)}`;

    const payload = {
      ...partial,
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('Fallo PATCH con Supabase:', await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error al actualizar en Supabase (PATCH):', err);
    return false;
  }
}

/**
 * 4. ELIMINAR APUESTA DE SUPABASE
 */
export async function deleteBetInSupabase(
  id: string,
  config: SupabaseConfig
): Promise<boolean> {
  if (!config.enabled || !config.url || !config.anonKey) {
    return false;
  }
  try {
    const cleanUrl = config.url.replace(/\/$/, '');
    const endpoint = `${cleanUrl}/rest/v1/bets?id=eq.${encodeURIComponent(id)}`;

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    if (!response.ok) {
      console.warn('Fallo DELETE con Supabase:', await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error al eliminar en Supabase (DELETE):', err);
    return false;
  }
}

/**
 * Exporta todas las apuestas como archivo JSON
 */
export function exportBetsToJson(bets: Bet[]): void {
  const dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(bets, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute(
    'download',
    `apuestas_deportivas_mvp_${new Date().toISOString().split('T')[0]}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Exporta como archivo CSV de estilo Excel
 */
export function exportBetsToCsv(bets: Bet[]): void {
  const headers = [
    'ID',
    'Fecha creacion',
    'Fecha evento',
    'Deporte',
    'Evento',
    'Casa de apuestas',
    'Stake',
    'Cuota',
    'Estado',
    'Beneficio',
  ];

  const rows = bets.map((b) => [
    b.id,
    b.created_at,
    b.event_date || '',
    b.sport || '',
    (b.event || '').replace(/,/g, ' '),
    (b.bookmaker || '').replace(/,/g, ' '),
    b.stake,
    b.odds,
    b.status,
    b.profit,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    headers.join(',') +
    '\n' +
    rows.map((e) => e.join(',')).join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `apuestas_historial_${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
}
