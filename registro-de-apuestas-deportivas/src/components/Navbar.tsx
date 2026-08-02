import React from 'react';
import {
  TrendingUp,
  Clock,
  History,
  Plus,
  Database,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Cloud,
  Menu,
  X,
} from 'lucide-react';

export type AppTab = 'dashboard' | 'pending' | 'history';

interface NavbarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  pendingCount: number;
  onOpenNewBet: () => void;
  onOpenSupabaseModal: () => void;
  supabaseConnected: boolean;
  isSyncing?: boolean;
  lastSynced?: string | null;
  onSyncNow?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  pendingCount,
  onOpenNewBet,
  onOpenSupabaseModal,
  supabaseConnected,
  isSyncing = false,
  lastSynced = null,
  onSyncNow,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const tabs = [
    {
      id: 'dashboard' as AppTab,
      label: 'Dashboard',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'pending' as AppTab,
      label: 'Pendientes',
      icon: <Clock className="w-4 h-4" />,
      badge: pendingCount,
    },
    {
      id: 'history' as AppTab,
      label: 'Historial',
      icon: <History className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Nombre */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/40 transition">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  BetTracker <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">MVP</span>
                </span>
                <span className="text-[11px] text-zinc-400 block hidden sm:block">
                  Registro y análisis en 10s
                </span>
              </div>
            </button>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-150 ${
                    isActive
                      ? 'bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full ${
                        isActive
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Acciones del Extremo Derecho */}
          <div className="hidden md:flex items-center gap-2">
            {/* Botón rápido de sincronización en la nube */}
            {supabaseConnected && onSyncNow && (
              <button
                onClick={onSyncNow}
                title="Sincronizar ahora con Supabase"
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`}
                />
              </button>
            )}

            {/* Config Supabase SQL */}
            <button
              onClick={onOpenSupabaseModal}
              title="Configurar Supabase / Ver SQL"
              className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition ${
                supabaseConnected
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-950/20 text-amber-300 hover:border-amber-400/50'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>
                {supabaseConnected
                  ? `Supabase ON ${lastSynced ? `(${lastSynced})` : ''}`
                  : '☁️ Conectar Supabase'}
              </span>
            </button>

            {/* Botón Principal: Nueva apuesta (< 10s) */}
            <button
              onClick={onOpenNewBet}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/10 flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva apuesta</span>
              <kbd className="hidden lg:inline-flex ml-1 items-center px-1.5 py-0.5 text-[10px] font-mono bg-zinc-900/30 text-zinc-950 rounded border border-zinc-950/20">
                N
              </kbd>
            </button>
          </div>

          {/* Botón menú móvil */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={onOpenSupabaseModal}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 border ${
                supabaseConnected
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-950/20 text-amber-300'
              }`}
            >
              <Cloud className="w-3 h-3" />
              <span>{supabaseConnected ? '☁️ ON' : '☁️ SQL'}</span>
            </button>
            <button
              onClick={onOpenNewBet}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-zinc-950 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Desplegable Móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 pt-3 pb-4 space-y-2">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between ${
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

            <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  onOpenSupabaseModal();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Base de datos SQL (Supabase)</span>
              </button>
            </div>
          </div>
        )}
    </header>
  );
};
