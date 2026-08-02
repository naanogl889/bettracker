import React, { useState } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Save,
  AlertCircle,
} from 'lucide-react';
import {
  SupabaseConfig,
  SUPABASE_SQL_SCHEMA,
} from '../services/betsStorage';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SupabaseConfig;
  onSaveConfig: (newConfig: SupabaseConfig) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [url, setUrl] = useState(config.url || '');
  const [anonKey, setAnonKey] = useState(config.anonKey || '');
  const [enabled, setEnabled] = useState(config.enabled || false);
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      url: url.trim(),
      anonKey: anonKey.trim(),
      enabled,
    });
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Base de Datos Nube (Supabase PostgreSQL)
              </h2>
              <p className="text-xs text-zinc-400">
                Herramienta personal privada • Sincronización instantánea móvil ↔ PC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Explicación arquitectónica */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Uso Personal Privado Sin Login
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              La aplicación está optimizada para que accedas directamente a tu
              dashboard sin contraseñas ni registros. Tus apuestas se almacenan
              en <strong>Supabase PostgreSQL</strong> como fuente principal y se
              sincronizan automáticamente entre tu móvil, ordenador y cualquier
              dispositivo. Para crear tu tabla{' '}
              <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300 font-mono">
                bets
              </code>{' '}
              ejecutando el siguiente código SQL en tu Editor SQL de Supabase:
            </p>
          </div>

          {/* Bloque SQL con botón de copia */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                SQL para crear la tabla bets en PostgreSQL
              </span>
              <button
                onClick={handleCopySql}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-emerald-300 font-mono overflow-x-auto max-h-56 leading-relaxed">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>

          {/* Formulario opcional de conexión REST API */}
          <form
            onSubmit={handleSave}
            className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Sincronización Cloud (Opcional)
                </h4>
                <p className="text-xs text-zinc-400">
                  Conecta la URL de tu proyecto y clave anónima para sincronizar
                  las apuestas automáticamente.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {enabled && (
              <div className="space-y-3 pt-2 border-t border-zinc-800 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyz...supabase.co"
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Supabase Anon Key
                  </label>
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              {savedMessage && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mr-2">
                  <Check className="w-4 h-4" /> Configuración guardada
                </span>
              )}
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Configuración</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer modal */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
          >
            <span>Documentación de Supabase</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
