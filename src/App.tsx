import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar, AppTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { PendingView } from './components/PendingView';
import { HistoryView } from './components/HistoryView';
import { NewBetModal } from './components/NewBetModal';
import { EditBetModal } from './components/EditBetModal';
import { SupabaseModal } from './components/SupabaseModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import {
  Bet,
  BetStatus,
} from './types/bets';
import {
  getStoredBets,
  saveStoredBets,
  getSupabaseConfig,
  saveSupabaseConfig,
  syncBetWithSupabase,
  fetchBetsFromSupabase,
  upsertBetInSupabase,
  updateBetInSupabase,
  deleteBetInSupabase,
  exportBetsToJson,
  exportBetsToCsv,
  restoreSampleBets,
  clearAllBets,
  SupabaseConfig,
} from './services/betsStorage';
import { calculateProfitForBet } from './utils/metrics';

export default function App() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');
  const [isNewBetOpen, setIsNewBetOpen] = useState(false);
  const [editingBet, setEditingBet] = useState<Bet | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() =>
    getSupabaseConfig()
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Toast helper
  const addToast = useCallback(
    (
      type: 'success' | 'error' | 'info',
      title: string,
      description?: string
    ) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 1. SINCRONIZACIÓN EN LA NUBE (Supabase PostgreSQL como fuente primaria)
  const syncFromCloud = useCallback(
    async (config: SupabaseConfig, silent = true) => {
      if (!config.enabled || !config.url || !config.anonKey) return;
      if (!silent) setIsSyncing(true);
      try {
        const remoteBets = await fetchBetsFromSupabase(config);
        if (remoteBets && Array.isArray(remoteBets)) {
          setBets(remoteBets);
          saveStoredBets(remoteBets);
          setLastSynced(
            new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          );
          if (!silent) {
            addToast(
              'success',
              '☁️ Datos sincronizados',
              `Historial cargado desde tu base de datos Supabase (${remoteBets.length} apuestas).`
            );
          }
        } else if (!silent) {
          addToast(
            'error',
            'Error al sincronizar',
            'Revisa la URL o API Key en Configuración de Supabase.'
          );
        }
      } catch (e) {
        if (!silent) {
          addToast(
            'error',
            'Error de conexión',
            'No se pudo conectar con Supabase.'
          );
        }
      } finally {
        if (!silent) setIsSyncing(false);
      }
    },
    [addToast]
  );

  // 2. Cargar inmediatamente caché local para cero latencia y sincronizar con Supabase en segundo plano
  useEffect(() => {
    const loaded = getStoredBets();
    setBets(loaded);
    if (supabaseConfig.enabled) {
      syncFromCloud(supabaseConfig, true);
    }
  }, [supabaseConfig, syncFromCloud]);

  // 3. Sincronización automática periódica (cada 30 segundos) entre dispositivos (móvil ↔ PC)
  useEffect(() => {
    if (!supabaseConfig.enabled) return;
    const interval = setInterval(() => {
      syncFromCloud(supabaseConfig, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [supabaseConfig, syncFromCloud]);

  // Guardar en localStorage como caché secundaria al cambiar
  useEffect(() => {
    if (bets.length > 0) {
      saveStoredBets(bets);
    }
  }, [bets]);

  // Atajo de teclado 'N' para nueva apuesta
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsNewBetOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // APUESTA NUEVA O MATCHED BETTING
  const handleAddBet = async (
    betData: Omit<Bet, 'id' | 'created_at' | 'status' | 'profit'> & {
      status?: 'pending' | 'won' | 'lost' | 'void';
      profit?: number;
      category?: 'value' | 'matched';
    }
  ) => {
    const now = new Date().toISOString();
    const isMatched = betData.category === 'matched';
    const newBet: Bet = {
      ...betData,
      id: `bet-${Date.now().toString(36)}`,
      created_at: now,
      updated_at: now,
      status: betData.status || 'pending',
      profit:
        betData.profit !== undefined
          ? betData.profit
          : betData.status === 'won'
            ? Number((betData.stake * (betData.odds - 1)).toFixed(2))
            : 0,
      category: betData.category || 'value',
    };

    const nextBets = [newBet, ...bets];
    setBets(nextBets);
    saveStoredBets(nextBets);

    addToast(
      'success',
      isMatched ? '🎁 ¡Matched Betting registrado!' : '¡Apuesta registrada!',
      isMatched
        ? `${newBet.bookmaker} • Beneficio: +${newBet.profit}€ (${newBet.event || 'Promoción'})`
        : `${newBet.bookmaker} • Stake ${newBet.stake}€ (@${newBet.odds}) — Estado: Pendiente`
    );

    // Sincronizar inmediatamente con Supabase (fuente online de datos)
    if (supabaseConfig.enabled) {
      upsertBetInSupabase(newBet, supabaseConfig).then((ok) => {
        if (ok) {
          setLastSynced(
            new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          );
        }
      });
    }
  };

  // RESOLVER APUESTA PENDIENTE (< 2s)
  const handleResolveBet = (id: string, newStatus: 'won' | 'lost') => {
    const targetBet = bets.find((b) => b.id === id);
    if (!targetBet) return;

    const calculatedProfit = calculateProfitForBet(
      targetBet.stake,
      targetBet.odds,
      newStatus
    );

    const updatedBets = bets.map((bet) => {
      if (bet.id === id) {
        return {
          ...bet,
          status: newStatus,
          profit: calculatedProfit,
          updated_at: new Date().toISOString(),
        };
      }
      return bet;
    });

    setBets(updatedBets);
    saveStoredBets(updatedBets);

    const isWon = newStatus === 'won';
    addToast(
      isWon ? 'success' : 'info',
      isWon ? '✅ ¡Apuesta ganada!' : '❌ Apuesta registrada como perdida',
      `Beneficio: ${isWon ? '+' : ''}${calculatedProfit}€ (${targetBet.bookmaker})`
    );

    // Sync directo con Supabase PostgreSQL
    if (supabaseConfig.enabled) {
      updateBetInSupabase(
        id,
        {
          status: newStatus,
          profit: calculatedProfit,
          updated_at: new Date().toISOString(),
        },
        supabaseConfig
      ).then((ok) => {
        if (ok) {
          setLastSynced(
            new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          );
        }
      });
    }
  };

  // EDITAR APUESTA
  const handleSaveEditedBet = (updatedBet: Bet) => {
    const payload = {
      ...updatedBet,
      updated_at: new Date().toISOString(),
    };
    const nextBets = bets.map((b) => (b.id === payload.id ? payload : b));
    setBets(nextBets);
    saveStoredBets(nextBets);
    addToast('success', 'Apuesta actualizada correctamente');

    if (supabaseConfig.enabled) {
      upsertBetInSupabase(payload, supabaseConfig).then((ok) => {
        if (ok) {
          setLastSynced(
            new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          );
        }
      });
    }
  };

  // ELIMINAR APUESTA
  const handleDeleteBet = (id: string) => {
    const nextBets = bets.filter((b) => b.id !== id);
    setBets(nextBets);
    saveStoredBets(nextBets);
    addToast('info', 'Apuesta eliminada del registro');

    if (supabaseConfig.enabled) {
      deleteBetInSupabase(id, supabaseConfig).then((ok) => {
        if (ok) {
          setLastSynced(
            new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          );
        }
      });
    }
  };

  // VACIAR Y RESTAURAR
  const handleRestoreSample = () => {
    const restored = restoreSampleBets();
    setBets(restored);
    addToast('info', 'Se han restaurado las apuestas de demostración');
  };

  const handleClearAll = () => {
    const emptied = clearAllBets();
    setBets(emptied);
    addToast('info', 'Se ha vaciado todo el historial de apuestas');
  };

  // Guardar configuración Supabase
  const handleSaveSupabaseConfig = (newConfig: SupabaseConfig) => {
    setSupabaseConfig(newConfig);
    saveSupabaseConfig(newConfig);
    if (newConfig.enabled) {
      syncFromCloud(newConfig, false);
    }
  };

  const pendingBets = useMemo(
    () => bets.filter((b) => b.status === 'pending'),
    [bets]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Toast Notificaciones flotantes */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Navbar SaaS Professional Polish */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingCount={pendingBets.length}
        onOpenNewBet={() => setIsNewBetOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        supabaseConnected={supabaseConfig.enabled}
        isSyncing={isSyncing}
        lastSynced={lastSynced}
        onSyncNow={() => syncFromCloud(supabaseConfig, false)}
      />

      {/* Contenido Principal */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            bets={bets}
            onOpenNewBet={() => setIsNewBetOpen(true)}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'pending' && (
          <PendingView
            pendingBets={pendingBets}
            onResolveBet={handleResolveBet}
            onEditBet={(bet) => setEditingBet(bet)}
            onDeleteBet={handleDeleteBet}
            onOpenNewBet={() => setIsNewBetOpen(true)}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView
            bets={bets}
            onEditBet={(bet) => setEditingBet(bet)}
            onDeleteBet={handleDeleteBet}
            onExportJson={() => exportBetsToJson(bets)}
            onExportCsv={() => exportBetsToCsv(bets)}
            onRestoreSample={handleRestoreSample}
            onClearAll={handleClearAll}
          />
        )}
      </main>

      {/* Modales */}
      <NewBetModal
        isOpen={isNewBetOpen}
        onClose={() => setIsNewBetOpen(false)}
        onAddBet={handleAddBet}
      />

      <EditBetModal
        bet={editingBet}
        isOpen={!!editingBet}
        onClose={() => setEditingBet(null)}
        onSave={handleSaveEditedBet}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        config={supabaseConfig}
        onSaveConfig={handleSaveSupabaseConfig}
      />

      {/* Footer Sencillo y Minimalista */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-5 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400">BetTracker MVP</span>
            <span>•</span>
            <span>Registro diario de apuestas en menos de 10s</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="hover:text-zinc-300 transition"
            >
              SQL para Supabase PostgreSQL
            </button>
            <span>•</span>
            <span className="font-mono text-zinc-400">v1.0 (Professional Polish)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
