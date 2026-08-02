import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  DollarSign,
  Calendar,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Zap,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { Bet } from '../types/bets';

interface PendingViewProps {
  pendingBets: Bet[];
  onResolveBet: (id: string, newStatus: 'won' | 'lost') => void;
  onEditBet: (bet: Bet) => void;
  onDeleteBet: (id: string) => void;
  onOpenNewBet: () => void;
}

export const PendingView: React.FC<PendingViewProps> = ({
  pendingBets,
  onResolveBet,
  onEditBet,
  onDeleteBet,
  onOpenNewBet,
}) => {
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Formateador relativo de fecha (ej: "hace 2h" o "hoy")
  const formatRelativeDate = (dateStr: string) => {
    try {
      const betTime = new Date(dateStr).getTime();
      const now = new Date().getTime();
      const diffMin = Math.round((now - betTime) / (1000 * 60));
      if (diffMin < 60) return `hace ${Math.max(1, diffMin)} min`;
      const diffHours = Math.round(diffMin / 60);
      if (diffHours < 24) return `hace ${diffHours} h`;
      const diffDays = Math.round(diffHours / 24);
      if (diffDays === 1) return 'ayer';
      return `hace ${diffDays} días`;
    } catch {
      return dateStr.split('T')[0];
    }
  };

  // Resolución con micro-animación
  const handleFastResolve = (id: string, newStatus: 'won' | 'lost') => {
    setResolvingId(id);
    setTimeout(() => {
      onResolveBet(id, newStatus);
      setResolvingId(null);
    }, 120);
  };

  // Atajos de teclado en modo racha para resolver la primera apuesta (1 / G -> ganada, 2 / P -> perdida)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pendingBets.length === 0) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const topBet = pendingBets[0];
      if (e.key === '1' || e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleFastResolve(topBet.id, 'won');
      } else if (e.key === '2' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleFastResolve(topBet.id, 'lost');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingBets]);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Cabecera Modo Racha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Pendientes ({pendingBets.length})</span>
            </span>
            <span className="text-xs text-zinc-400">
              • Flujo ultrarrápido (1 clik por apuesta)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
            Resolución en Racha
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Atajos de teclado activos:{' '}
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-emerald-400 border border-zinc-700">
              1
            </kbd>{' '}
            para Ganada •{' '}
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-rose-400 border border-zinc-700">
              2
            </kbd>{' '}
            para Perdida.
          </p>
        </div>

        <button
          onClick={onOpenNewBet}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold shadow-md shadow-emerald-500/15 flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva apuesta</span>
        </button>
      </div>

      {/* Tarjetas grandes, limpias y fáciles de recorrer */}
      {pendingBets.length > 0 ? (
        <div className="space-y-5">
          {pendingBets.map((bet, index) => {
            const potentialWin = Number(
              (bet.stake * (bet.odds - 1)).toFixed(2)
            );
            const isTop = index === 0;
            const isResolving = resolvingId === bet.id;

            return (
              <div
                key={bet.id}
                className={`relative bg-zinc-900 border transition-all duration-200 rounded-3xl p-6 sm:p-7 shadow-2xl ${
                  isTop
                    ? 'border-amber-500/40 ring-1 ring-amber-500/20 bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-950'
                    : 'border-zinc-800/80 opacity-80 hover:opacity-100'
                } ${isResolving ? 'scale-95 opacity-0 duration-150' : ''}`}
              >
                {/* Badges superiores */}
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                  <div className="flex items-center gap-2">
                    {isTop && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>Apuesta activa</span>
                      </span>
                    )}
                    <span className="font-semibold text-zinc-300 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{bet.bookmaker}</span>
                    </span>
                    {bet.sport && (
                      <span className="text-zinc-500">• {bet.sport}</span>
                    )}
                  </div>

                  <span className="text-zinc-500 font-mono text-xs">
                    {formatRelativeDate(bet.created_at)}
                  </span>
                </div>

                {/* Título del evento / partido (esencial) */}
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-5">
                  {bet.event ||
                    `Apuesta en ${bet.sport || 'Deporte'} (@${bet.bookmaker})`}
                </h3>

                {/* Información ESENCIAL: Stake y Cuota */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 mb-6">
                  <div>
                    <span className="text-xs uppercase font-bold text-zinc-500 block">
                      Stake apostado
                    </span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                      {bet.stake} €
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold text-zinc-500 block">
                      Cuota / Beneficio Potencial
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                        @{bet.odds}
                      </span>
                      <span className="text-sm font-mono font-bold text-emerald-300/90">
                        (+{potentialWin}€)
                      </span>
                    </div>
                  </div>
                </div>

                {/* DOS BOTONES MUY GRANDES Y CLARAMENTE DIFERENCIADOS */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Botón ✅ GANADA */}
                  <button
                    onClick={() => handleFastResolve(bet.id, 'won')}
                    className="py-4 sm:py-5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 text-base sm:text-lg font-extrabold shadow-xl shadow-emerald-500/20 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95"
                    title="Resolver como Ganada (Atajo: 1)"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✅</span>
                      <span>Ganada</span>
                    </div>
                    <span className="text-xs font-mono font-bold opacity-80">
                      +{potentialWin}€ beneficio
                    </span>
                  </button>

                  {/* Botón ❌ PERDIDA */}
                  <button
                    onClick={() => handleFastResolve(bet.id, 'lost')}
                    className="py-4 sm:py-5 px-4 rounded-2xl bg-zinc-800 hover:bg-rose-600 active:bg-rose-700 text-white hover:text-white text-base sm:text-lg font-extrabold border border-zinc-700 hover:border-rose-500 shadow-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 group/loss"
                    title="Resolver como Perdida (Atajo: 2)"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">❌</span>
                      <span>Perdida</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-zinc-400 group-hover/loss:text-rose-100">
                      -{bet.stake}€ stake
                    </span>
                  </button>
                </div>

                {/* Acciones secundarias discretas en esquina inferior */}
                <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-zinc-800/60">
                  <button
                    onClick={() => onEditBet(bet)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 px-2.5 py-1 rounded-lg hover:bg-zinc-800 transition flex items-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => onDeleteBet(bet.id)}
                    className="text-xs text-zinc-500 hover:text-rose-400 px-2.5 py-1 rounded-lg hover:bg-rose-500/10 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Estado vacío premium */
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              ¡Todo resuelto! 0 apuestas pendientes
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 max-w-md mx-auto">
              Has resuelto todas tus apuestas activas. Tu balance en el Dashboard
              está totalmente actualizado.
            </p>
          </div>
          <button
            onClick={onOpenNewBet}
            className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar nueva apuesta</span>
          </button>
        </div>
      )}
    </div>
  );
};

