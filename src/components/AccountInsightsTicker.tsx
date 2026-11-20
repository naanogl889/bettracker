import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import { Bet } from '../types/bets';
import {
  AccountInsightItem,
  generateAccountInsights,
  InsightCategory,
  InsightTone,
} from '../utils/accountInsights';

interface AccountInsightsTickerProps {
  bets: Bet[];
}

function getToneClass(tone?: InsightTone): string {
  switch (tone) {
    case 'emerald':
      return 'text-emerald-400 font-bold font-mono tabular-nums';
    case 'rose':
      return 'text-rose-400 font-bold font-mono tabular-nums';
    case 'sky':
      return 'text-sky-400 font-bold font-mono tabular-nums';
    case 'cyan':
      return 'text-cyan-400 font-bold font-mono tabular-nums';
    case 'amber':
      return 'text-amber-400 font-bold font-mono tabular-nums';
    case 'bold':
      return 'text-white font-semibold';
    default:
      return 'text-zinc-300';
  }
}

export const AccountInsightsTicker: React.FC<AccountInsightsTickerProps> = ({
  bets,
}) => {
  const insights = useMemo(() => generateAccountInsights(bets), [bets]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | InsightCategory>('all');

  // Mantener índice válido si cambia el número de insights
  useEffect(() => {
    if (currentIndex >= insights.length) {
      setCurrentIndex(0);
    }
  }, [insights.length, currentIndex]);

  // Rotación automática cada 5 segundos
  useEffect(() => {
    if (insights.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [insights.length]);

  // Cerrar modal con Esc
  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen]);

  const currentInsight: AccountInsightItem | null =
    insights.length > 0 ? insights[currentIndex % insights.length] : null;

  const filteredModalInsights = useMemo(() => {
    if (categoryFilter === 'all') return insights;
    return insights.filter((i) => i.category === categoryFilter);
  }, [insights, categoryFilter]);

  return (
    <>
      {/* Recuadro horizontal de una sola línea debajo de los 4 recuadros principales */}
      <button
        type="button"
        onClick={() => {
          setCategoryFilter('all');
          setIsModalOpen(true);
        }}
        className="mt-3.5 w-full rounded-xl bg-zinc-950/90 border border-zinc-800/90 hover:border-sky-500/45 hover:bg-zinc-950 px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-3 transition-all group text-left cursor-pointer"
        title="Haz clic para ver todas las estadísticas y récords de tu cuenta"
      >
        <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden">
          {currentInsight ? (
            <div
              key={currentInsight.id}
              className="flex items-center gap-2 min-w-0 max-w-full text-xs sm:text-[13px] whitespace-nowrap truncate animate-fade-in"
            >
              <span className="shrink-0" aria-hidden="true">
                {currentInsight.emoji}
              </span>
              <span className="truncate text-zinc-300">
                <strong className="font-semibold text-white">
                  {currentInsight.title}:
                </strong>{' '}
                {currentInsight.segments.map((seg, idx) => (
                  <span key={idx} className={getToneClass(seg.tone)}>
                    {seg.text}
                  </span>
                ))}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs sm:text-[13px] text-zinc-400 whitespace-nowrap truncate">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">
                Registra y resuelve tus primeras apuestas para ver aquí tus récords y estadísticas destacadas.
              </span>
            </div>
          )}
        </div>

        {insights.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-[11px] text-zinc-500 group-hover:text-sky-400 transition-colors font-mono tabular-nums">
            <span>
              {currentIndex + 1}/{insights.length}
            </span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}
      </button>

      {/* Modal con todas las estadísticas y récords detallados */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Estadísticas y Récords de tu Cuenta</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {insights.length} métricas calculadas en tiempo real sobre todo tu historial resuelto
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de categorías */}
            {insights.length > 0 && (
              <div className="px-5 py-2.5 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: 'all', label: `Todas (${insights.length})` },
                  { id: 'operators', label: 'Operadores' },
                  { id: 'weekly', label: 'Semanal' },
                  { id: 'monthly', label: 'Mensual' },
                  { id: 'records', label: 'Récords y Forma' },
                ].map((tab) => {
                  const isActive = categoryFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCategoryFilter(tab.id as 'all' | InsightCategory)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 border ${
                        isActive
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                          : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Listado de todas las estadísticas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {filteredModalInsights.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-400">
                  Aún no hay apuestas resueltas suficientes para generar estas estadísticas.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredModalInsights.map((item) => {
                    const isCurrentlyShown =
                      currentInsight && currentInsight.id === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border transition bg-zinc-950/75 flex items-start gap-3 ${
                          isCurrentlyShown
                            ? 'border-sky-500/50 bg-sky-500/5'
                            : 'border-zinc-800/80 hover:border-zinc-700'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-base shrink-0 mt-0.5"
                          aria-hidden="true"
                        >
                          {item.emoji}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                            <span>{item.categoryLabel}</span>
                            {isCurrentlyShown && (
                              <span className="text-sky-400 font-medium">
                                Visible ahora
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white">
                            {item.title}
                          </div>
                          <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                            {item.segments.map((seg, idx) => (
                              <span key={idx} className={getToneClass(seg.tone)}>
                                {seg.text}
                              </span>
                            ))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pie del modal */}
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
              <span>Rotación automática en el resumen cada 5 segundos</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
