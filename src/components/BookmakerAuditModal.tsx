import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Landmark,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Bet } from '../types/bets';
import { extractStableYMD, parseLocalDateFromYMD } from '../utils/metrics';

export type BookmakerPeriodMode = 'all' | 'annual' | 'monthly';

interface BookmakerAuditModalProps {
  bookmaker: string;
  allStrategyBets: Bet[];
  initialPeriodMode: BookmakerPeriodMode;
  initialYear: string;
  initialMonth: string;
  onClose: () => void;
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const SHORT_MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export interface BookmakerBrandVisual {
  short: string;
  badgeClass: string;
  topAccentClass: string;
}

export function getBookmakerBrandVisual(name: string): BookmakerBrandVisual {
  const lower = name.toLowerCase();
  if (lower.includes('bet365')) {
    return {
      short: '365',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      topAccentClass: 'from-emerald-500/90 via-emerald-400/50',
    };
  }
  if (lower.includes('winamax')) {
    return {
      short: 'W',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      topAccentClass: 'from-rose-500/90 via-rose-400/50',
    };
  }
  if (lower.includes('codere')) {
    return {
      short: 'C',
      badgeClass: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
      topAccentClass: 'from-lime-500/90 via-emerald-400/50',
    };
  }
  if (lower.includes('gran casino') || lower.includes('madrid')) {
    return {
      short: 'GM',
      badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
      topAccentClass: 'from-pink-500/90 via-rose-400/50',
    };
  }
  if (lower.includes('william')) {
    return {
      short: 'WH',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      topAccentClass: 'from-blue-500/90 via-sky-400/50',
    };
  }
  if (lower.includes('betfair')) {
    return {
      short: 'BF',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      topAccentClass: 'from-amber-500/90 via-amber-400/50',
    };
  }
  if (lower.includes('betway')) {
    return {
      short: 'BW',
      badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      topAccentClass: 'from-teal-500/90 via-emerald-400/50',
    };
  }
  if (lower.includes('interwetten')) {
    return {
      short: 'IW',
      badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
      topAccentClass: 'from-yellow-500/90 via-amber-400/50',
    };
  }
  if (lower.includes('pokerstars')) {
    return {
      short: 'PS',
      badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
      topAccentClass: 'from-red-500/90 via-rose-400/50',
    };
  }
  if (lower.includes('versus')) {
    return {
      short: 'VS',
      badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
      topAccentClass: 'from-fuchsia-500/90 via-pink-400/50',
    };
  }
  if (lower.includes('yosports') || lower.includes('yo sports')) {
    return {
      short: 'YO',
      badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      topAccentClass: 'from-sky-500/90 via-cyan-400/50',
    };
  }
  if (lower.includes('admiral')) {
    return {
      short: 'AB',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      topAccentClass: 'from-indigo-500/90 via-sky-400/50',
    };
  }
  if (lower.includes('tony')) {
    return {
      short: 'TB',
      badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
      topAccentClass: 'from-violet-500/90 via-indigo-400/50',
    };
  }
  if (lower.includes('speedy')) {
    return {
      short: 'SB',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      topAccentClass: 'from-cyan-500/90 via-sky-400/50',
    };
  }

  const words = name.trim().split(/\s+/);
  const initials =
    words.length >= 2
      ? `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();

  return {
    short: initials || 'BK',
    badgeClass: 'bg-zinc-800/80 text-zinc-200 border-zinc-700',
    topAccentClass: 'from-cyan-500/80 via-emerald-400/40',
  };
}

function formatEuro(val: number, showPlus = true): string {
  const prefix = showPlus && val > 0 ? '+' : '';
  return `${prefix}${val.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function formatDateDMY(ymd: string | null): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '—';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateDM(ymd: string | null): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '—';
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
}

export const BookmakerAuditModal: React.FC<BookmakerAuditModalProps> = ({
  bookmaker,
  allStrategyBets,
  initialPeriodMode,
  initialYear,
  initialMonth,
  onClose,
}) => {
  const [periodMode, setPeriodMode] = useState<BookmakerPeriodMode>(initialPeriodMode);
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Todas las apuestas históricas de esta casa (case-insensitive)
  const bookmakerAllBets = useMemo(() => {
    const targetLower = bookmaker.trim().toLowerCase();
    return allStrategyBets.filter(
      (b) => (b.bookmaker || '').trim().toLowerCase() === targetLower
    );
  }, [allStrategyBets, bookmaker]);

  // Años y meses disponibles específicamente para esta casa
  const availableYears = useMemo(() => {
    const yrs = new Set<string>();
    for (const bet of bookmakerAllBets) {
      const ymd = extractStableYMD(bet);
      if (ymd) yrs.add(ymd.slice(0, 4));
    }
    return Array.from(yrs).sort((a, b) => b.localeCompare(a));
  }, [bookmakerAllBets]);

  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    for (const bet of bookmakerAllBets) {
      const ymd = extractStableYMD(bet);
      if (!ymd) continue;
      const mKey = ymd.slice(0, 7);
      if (!map.has(mKey)) {
        const [yStr, mStr] = mKey.split('-');
        const mIdx = parseInt(mStr, 10) - 1;
        map.set(mKey, `${MONTH_NAMES_ES[mIdx] || mStr} ${yStr}`);
      }
    }
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [bookmakerAllBets]);

  // Asegurar que el año o mes seleccionado existe para esta casa
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    if (
      availableMonths.length > 0 &&
      !availableMonths.some((m) => m.key === selectedMonth)
    ) {
      setSelectedMonth(availableMonths[0].key);
    }
  }, [availableMonths, selectedMonth]);

  // Apuestas filtradas por el rango seleccionado en la ficha
  const periodBets = useMemo(() => {
    if (periodMode === 'all') return bookmakerAllBets;
    if (periodMode === 'annual') {
      return bookmakerAllBets.filter((b) => {
        const ymd = extractStableYMD(b);
        return ymd ? ymd.startsWith(selectedYear) : false;
      });
    }
    return bookmakerAllBets.filter((b) => {
      const ymd = extractStableYMD(b);
      return ymd ? ymd.startsWith(selectedMonth) : false;
    });
  }, [bookmakerAllBets, periodMode, selectedYear, selectedMonth]);

  // Ordenar apuestas para el historial (más recientes primero)
  const historyBetsDesc = useMemo(() => {
    return [...periodBets].sort((a, b) => {
      const ymdA = extractStableYMD(a) || a.created_at;
      const ymdB = extractStableYMD(b) || b.created_at;
      if (ymdA !== ymdB) return ymdB.localeCompare(ymdA);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [periodBets]);

  // Métricas consolidadas y serie acumulada para la gráfica de evolución
  const { stats, chartSeries } = useMemo(() => {
    const resolvedAsc = [...periodBets]
      .filter((b) => b.status === 'won' || b.status === 'lost')
      .sort((a, b) => {
        const ymdA = extractStableYMD(a) || a.created_at;
        const ymdB = extractStableYMD(b) || b.created_at;
        if (ymdA !== ymdB) return ymdA.localeCompare(ymdB);
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    let totalStake = 0;
    let totalProfit = 0;
    let wonBets = 0;
    let lostBets = 0;
    let oddsSum = 0;
    let oddsCount = 0;
    let maxWonOdds = 0;

    for (const b of periodBets) {
      if (b.odds > 0) {
        oddsSum += b.odds;
        oddsCount += 1;
      }
      if (b.status === 'won' || b.status === 'lost') {
        totalStake += b.stake || 0;
        totalProfit += b.profit || 0;
        if (b.status === 'won') {
          wonBets += 1;
          if ((b.odds || 0) > maxWonOdds) maxWonOdds = b.odds || 0;
        } else {
          lostBets += 1;
        }
      }
    }

    const resolvedCount = wonBets + lostBets;
    const avgStake = resolvedCount > 0 ? totalStake / resolvedCount : 0;
    const winRate =
      resolvedCount > 0 ? Number(((wonBets / resolvedCount) * 100).toFixed(1)) : 0;
    const yieldPct =
      totalStake > 0 ? Number(((totalProfit / totalStake) * 100).toFixed(1)) : 0;
    const avgOdds = oddsCount > 0 ? Number((oddsSum / oddsCount).toFixed(2)) : 0;
    const impliedWinRate = avgOdds > 0 ? (1 / avgOdds) * 100 : 0;
    const edgePct =
      resolvedCount > 0 && avgOdds > 0
        ? Number((winRate - impliedWinRate).toFixed(1))
        : 0;

    const ymds = periodBets
      .map(extractStableYMD)
      .filter((v): v is string => Boolean(v))
      .sort((a, b) => a.localeCompare(b));

    let betsPerWeek = 0;
    if (ymds.length > 0) {
      const firstDate = parseLocalDateFromYMD(ymds[0]);
      const lastDate = parseLocalDateFromYMD(ymds[ymds.length - 1]);
      const diffDays = Math.max(
        1,
        Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      );
      betsPerWeek = Number((periodBets.length / Math.max(1, diffDays / 7)).toFixed(1));
    }

    // Construir serie de evolución acumulada agrupada por fecha (o por apuesta si hay pocas)
    const series: Array<{
      label: string;
      fullDate: string;
      cumulative: number;
      stepProfit: number;
      betsInPoint: number;
      eventHint?: string;
    }> = [];

    if (resolvedAsc.length > 0) {
      series.push({
        label: 'Inicio',
        fullDate: 'Inicio del periodo',
        cumulative: 0,
        stepProfit: 0,
        betsInPoint: 0,
      });

      // Si hay <= 40 apuestas resueltas, graficar apuesta a apuesta para máxima precisión;
      // si hay más, agrupar por día YYYY-MM-DD para mantener una curva limpia
      if (resolvedAsc.length <= 40) {
        let running = 0;
        for (const bet of resolvedAsc) {
          running += bet.profit || 0;
          const ymd = extractStableYMD(bet);
          const dLabel = formatDateDM(ymd);
          const fullDate = ymd
            ? (() => {
                const [, m, d] = ymd.split('-');
                return `${parseInt(d, 10)} ${SHORT_MONTHS_ES[parseInt(m, 10) - 1] || m} ${ymd.slice(0, 4)}`;
              })()
            : 'Sin fecha';

          series.push({
            label: dLabel,
            fullDate,
            cumulative: Number(running.toFixed(2)),
            stepProfit: Number((bet.profit || 0).toFixed(2)),
            betsInPoint: 1,
            eventHint: bet.event || bet.sport || undefined,
          });
        }
      } else {
        const dailyMap = new Map<string, { profit: number; count: number }>();
        for (const bet of resolvedAsc) {
          const ymd = extractStableYMD(bet) || 'Sin fecha';
          const cur = dailyMap.get(ymd) || { profit: 0, count: 0 };
          cur.profit += bet.profit || 0;
          cur.count += 1;
          dailyMap.set(ymd, cur);
        }
        const sortedDays = Array.from(dailyMap.keys()).sort((a, b) => a.localeCompare(b));
        let running = 0;
        for (const ymd of sortedDays) {
          const d = dailyMap.get(ymd)!;
          running += d.profit;
          const label = formatDateDM(ymd);
          const fullDate = /^\d{4}-\d{2}-\d{2}$/.test(ymd)
            ? `${parseInt(ymd.slice(8, 10), 10)} ${SHORT_MONTHS_ES[parseInt(ymd.slice(5, 7), 10) - 1] || ymd.slice(5, 7)} ${ymd.slice(0, 4)}`
            : ymd;

          series.push({
            label,
            fullDate,
            cumulative: Number(running.toFixed(2)),
            stepProfit: Number(d.profit.toFixed(2)),
            betsInPoint: d.count,
          });
        }
      }
    }

    return {
      stats: {
        totalStake: Number(totalStake.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        avgStake: Number(avgStake.toFixed(2)),
        wonBets,
        lostBets,
        resolvedCount,
        winRate,
        yieldPct,
        avgOdds,
        maxWonOdds: Number(maxWonOdds.toFixed(2)),
        betsPerWeek,
        edgePct,
      },
      chartSeries: series,
    };
  }, [periodBets]);

  const brand = getBookmakerBrandVisual(bookmaker);
  const isPositiveNet = stats.totalProfit >= 0;
  const strokeColor = isPositiveNet ? '#10b981' : '#f43f5e';
  const gradientId = `bm-audit-grad-${bookmaker.replace(/[^a-zA-Z0-9]/g, '')}`;

  const activeMonthLabel =
    availableMonths.find((m) => m.key === selectedMonth)?.label || selectedMonth;
  const periodBadgeText =
    periodMode === 'all'
      ? 'Histórico'
      : periodMode === 'annual'
      ? `Año ${selectedYear}`
      : activeMonthLabel;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha técnica de ${bookmaker}`}
    >
      <div
        className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior de acento */}
        <div
          className={`h-[3px] w-full bg-gradient-to-r ${brand.topAccentClass} to-transparent shrink-0`}
        />

        {/* Cabecera del Modal */}
        <div className="p-5 sm:p-6 border-b border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 bg-zinc-900/40">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center font-extrabold text-sm tracking-tight shrink-0 ${brand.badgeClass}`}
            >
              {brand.short}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
                  Ficha Técnica y Auditoría
                </span>
                <span className="text-zinc-600" aria-hidden="true">
                  ·
                </span>
                <span className="text-[11px] font-semibold text-emerald-400">
                  {periodBadgeText}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate">
                {bookmaker}
              </h2>
              <p className="text-xs text-zinc-400 font-mono tabular-nums mt-0.5">
                {periodBets.length} apuestas en este periodo ({bookmakerAllBets.length} en total histórico)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
            {/* Selector Histórico / Anual / Mensual dentro de la ficha */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                {[
                  { id: 'all', label: 'Histórico', icon: Landmark },
                  { id: 'annual', label: 'Anual', icon: Calendar },
                  { id: 'monthly', label: 'Mensual', icon: CalendarDays },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = periodMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPeriodMode(tab.id as BookmakerPeriodMode)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border whitespace-nowrap ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : 'text-zinc-400 border-transparent hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {periodMode === 'annual' && availableYears.length > 0 && (
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  {availableYears.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedYear(yr)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition whitespace-nowrap ${
                        selectedYear === yr
                          ? 'bg-zinc-800 text-white border border-zinc-700'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}

              {periodMode === 'monthly' && availableMonths.length > 0 && (
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = availableMonths.findIndex((m) => m.key === selectedMonth);
                      if (idx >= 0 && idx < availableMonths.length - 1) {
                        setSelectedMonth(availableMonths[idx + 1].key);
                      }
                    }}
                    disabled={
                      availableMonths.findIndex((m) => m.key === selectedMonth) >=
                      availableMonths.length - 1
                    }
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition"
                    title="Mes anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-semibold text-zinc-200 min-w-[100px] text-center whitespace-nowrap">
                    {activeMonthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = availableMonths.findIndex((m) => m.key === selectedMonth);
                      if (idx > 0) {
                        setSelectedMonth(availableMonths[idx - 1].key);
                      }
                    }}
                    disabled={
                      availableMonths.findIndex((m) => m.key === selectedMonth) <= 0
                    }
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition"
                    title="Mes siguiente"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition shrink-0"
              aria-label="Cerrar ficha técnica"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo scrollable del modal */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* 1. Gráfica de Evolución Acumulada */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Evolución acumulada de beneficio en {bookmaker}</span>
              </h3>
              <div className="text-sm font-bold font-mono tabular-nums">
                <span className="text-zinc-400 font-normal mr-1.5">Balance Neto:</span>
                <span className={isPositiveNet ? 'text-emerald-400' : 'text-rose-400'}>
                  {formatEuro(stats.totalProfit)}
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/90 rounded-xl p-3 sm:p-4">
              {chartSeries.length < 2 ? (
                <div className="h-[200px] flex items-center justify-center text-xs text-zinc-500">
                  Sin suficientes apuestas resueltas para trazar evolución en este periodo
                </div>
              ) : (
                <div className="h-[215px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartSeries}
                      margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={strokeColor} stopOpacity={0.32} />
                          <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        minTickGap={28}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => `${val >= 0 && val !== 0 ? '+' : ''}${val} €`}
                      />
                      <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-zinc-950/95 border border-zinc-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-1 backdrop-blur-md min-w-[185px]">
                              <div className="font-bold text-white border-b border-zinc-800 pb-1">
                                {d.fullDate}
                              </div>
                              {d.eventHint && (
                                <div className="text-[11px] text-zinc-400 truncate max-w-[220px]">
                                  {d.eventHint}
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-zinc-400">Acumulado:</span>
                                <span
                                  className={`font-mono tabular-nums font-bold ${
                                    d.cumulative >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {formatEuro(d.cumulative)}
                                </span>
                              </div>
                              {d.betsInPoint > 0 && (
                                <div className="flex items-center justify-between gap-4 text-[11px]">
                                  <span className="text-zinc-400">
                                    {d.betsInPoint === 1
                                      ? 'Resultado apuesta:'
                                      : `Jornada (${d.betsInPoint} ap.):`}
                                  </span>
                                  <span
                                    className={`font-mono tabular-nums font-semibold ${
                                      d.stepProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {formatEuro(d.stepProfit)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke={strokeColor}
                        strokeWidth={2.5}
                        fill={`url(#${gradientId})`}
                        activeDot={{ r: 5, fill: strokeColor, stroke: '#09090b', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* 2. Cuadrícula de 8 KPIs detallados */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Volumen Invertido
              </span>
              <div className="text-lg font-extrabold font-mono tabular-nums text-white mt-1">
                {formatEuro(stats.totalStake, false)}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Stake Medio
              </span>
              <div className="text-lg font-extrabold font-mono tabular-nums text-white mt-1">
                {formatEuro(stats.avgStake, false)}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Tasa de Acierto
              </span>
              <div className="text-lg font-extrabold font-mono tabular-nums text-emerald-400 mt-1">
                {stats.winRate}%{' '}
                <span className="text-xs font-semibold text-zinc-300">
                  ({stats.wonBets}G / {stats.lostBets}P)
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Yield Consolidado
              </span>
              <div
                className={`text-lg font-extrabold font-mono tabular-nums mt-1 ${
                  stats.yieldPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {stats.yieldPct >= 0 ? '+' : ''}
                {stats.yieldPct}%
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Cuota Media Global
              </span>
              <div className="text-lg font-extrabold font-mono tabular-nums text-amber-400 mt-1">
                {stats.avgOdds > 0 ? `@${stats.avgOdds.toFixed(2)}` : '—'}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Mayor Cuota Ganada
              </span>
              <div className="text-lg font-extrabold font-mono tabular-nums text-amber-300 mt-1">
                {stats.maxWonOdds > 0 ? `@${stats.maxWonOdds.toFixed(2)}` : '—'}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Ritmo Semanal
              </span>
              <div className="text-lg font-extrabold font-mono tabular-nums text-cyan-400 mt-1">
                {stats.betsPerWeek} ap/sem
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Ventaja s/ Cuota (Edge)
              </span>
              <div
                className={`text-lg font-extrabold font-mono tabular-nums mt-1 ${
                  stats.edgePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {stats.resolvedCount > 0 && stats.avgOdds > 0
                  ? `${stats.edgePct >= 0 ? '+' : ''}${stats.edgePct}%`
                  : '—'}
              </div>
            </div>
          </div>

          {/* 3. Historial Completo de Apuestas de esta Casa para el Rango Seleccionado */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Pronósticos en {bookmaker} ({historyBetsDesc.length} registrados)
              </h4>
              <span className="text-[11px] text-zinc-500">
                Desplázate para ver todo el historial del rango seleccionado
              </span>
            </div>

            <div className="border border-zinc-800/90 rounded-xl bg-zinc-900/40 overflow-hidden">
              {historyBetsDesc.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-500">
                  No hay apuestas registradas en {bookmaker} para el rango seleccionado.
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-amber-400/90 z-10">
                      <tr>
                        <th className="py-2.5 px-3.5">Fecha</th>
                        <th className="py-2.5 px-3.5">Pick / Pronóstico</th>
                        <th className="py-2.5 px-3.5 text-right">Cuota</th>
                        <th className="py-2.5 px-3.5 text-right">Importe</th>
                        <th className="py-2.5 px-3.5 text-center">Estado</th>
                        <th className="py-2.5 px-3.5 text-right">Retorno</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-xs">
                      {historyBetsDesc.map((bet) => {
                        const ymd = extractStableYMD(bet);
                        const label =
                          bet.event?.trim() ||
                          bet.notes?.trim() ||
                          (bet.sport ? `Apuesta de ${bet.sport}` : 'Apuesta registrada');

                        const statusLabel =
                          bet.status === 'won'
                            ? 'Ganadora'
                            : bet.status === 'lost'
                            ? 'Perdedora'
                            : bet.status === 'void'
                            ? 'Nula'
                            : 'Pendiente';

                        const statusClass =
                          bet.status === 'won'
                            ? 'text-emerald-400'
                            : bet.status === 'lost'
                            ? 'text-rose-400'
                            : bet.status === 'void'
                            ? 'text-zinc-400'
                            : 'text-amber-400';

                        return (
                          <tr
                            key={bet.id}
                            className="hover:bg-zinc-800/35 transition-colors"
                          >
                            <td className="py-2.5 px-3.5 font-mono tabular-nums text-zinc-400 whitespace-nowrap">
                              {formatDateDMY(ymd)}
                            </td>
                            <td className="py-2.5 px-3.5 text-zinc-100 font-medium max-w-[340px]">
                              <div className="truncate" title={label}>
                                {label}
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-bold text-amber-400 whitespace-nowrap">
                              @{bet.odds.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-zinc-200 whitespace-nowrap">
                              {bet.stake.toFixed(2)} €
                            </td>
                            <td
                              className={`py-2.5 px-3.5 text-center font-semibold whitespace-nowrap ${statusClass}`}
                            >
                              {statusLabel}
                            </td>
                            <td
                              className={`py-2.5 px-3.5 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                                bet.status === 'won'
                                  ? 'text-emerald-400'
                                  : bet.status === 'lost'
                                  ? 'text-rose-400'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {bet.status === 'won' || bet.status === 'lost'
                                ? formatEuro(bet.profit)
                                : '0.00 €'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
