import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Trophy,
  BarChart2,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Gift,
  Sparkles,
  Layers,
  Search,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle2,
  Filter,
  ChevronDown,
  CalendarDays,
  X,
  Plus,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Bet, BookmakerMonthlyBreakdown } from '../types/bets';
import {
  calculateDashboardMetrics,
  calculateCumulativeProfit,
  calculateBookmakerStats,
  calculateComparativeMetrics,
  calculateStrategyStats,
} from '../utils/metrics';
import { AdvancedAnalyticsSection } from './AdvancedAnalyticsSection';
import { AccountInsightsTicker } from './AccountInsightsTicker';

interface DashboardViewProps {
  bets: Bet[];
  onOpenNewBet?: () => void;
  onNavigateToTab: (tab: 'pending' | 'history') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  bets,
  onOpenNewBet,
  onNavigateToTab,
}) => {
  const [chartPeriod, setChartPeriod] = useState<'all' | '30d' | '7d'>('all');
  const [chartStrategy, setChartStrategy] = useState<'all' | 'value' | 'matched'>('all');
  const [bookmakerMode, setBookmakerMode] = useState<'value' | 'matched' | 'all'>('value');
  const [bookmakerSortBy, setBookmakerSortBy] = useState<
    'profit' | 'betsCount' | 'stake' | 'roi' | 'bookmaker'
  >('profit');
  const [bookmakerSortOrder, setBookmakerSortOrder] = useState<'asc' | 'desc'>('desc');
  const [bookmakerSearch, setBookmakerSearch] = useState('');
  const [bookmakerFilterActiveOnly, setBookmakerFilterActiveOnly] = useState(false);
  const [bookmakerSelectedMonth, setBookmakerSelectedMonth] = useState<string>('all');
  const [bookmakerExpandedRows, setBookmakerExpandedRows] = useState<Record<string, boolean>>({});

  // Estados para la tarjeta de Beneficio Hoy / Ayer y el modal de desglose
  const [dayCardPeriod, setDayCardPeriod] = useState<'today' | 'yesterday'>('today');
  const [isDayBreakdownOpen, setIsDayBreakdownOpen] = useState(false);
  const [breakdownActiveTab, setBreakdownActiveTab] = useState<'today' | 'yesterday'>('today');

  const valueBets = React.useMemo(() => {
    return bets.filter((b) => !b.category || b.category === 'value');
  }, [bets]);

  const metrics = calculateDashboardMetrics(valueBets);
  const strategyStats = calculateStrategyStats(bets);
  const comp = calculateComparativeMetrics(valueBets);

  // Procesamiento avanzado y reactivo para la gráfica de beneficios
  const { chartData, chartMetrics } = React.useMemo(() => {
    // 1. Filtrar apuestas resueltas según la estrategia seleccionada
    let resolved = bets.filter((b) => b.status === 'won' || b.status === 'lost');

    if (chartStrategy === 'value') {
      resolved = resolved.filter((b) => !b.category || b.category === 'value');
    } else if (chartStrategy === 'matched') {
      resolved = resolved.filter((b) => b.category === 'matched');
    }

    // Ordenar cronológicamente (más antigua a más reciente)
    resolved.sort((a, b) => {
      const dateA = a.event_date || a.created_at;
      const dateB = b.event_date || b.created_at;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    if (resolved.length === 0) {
      return {
        chartData: [],
        chartMetrics: {
          periodProfit: 0,
          periodStake: 0,
          periodRoi: 0,
          totalBets: 0,
          wonBets: 0,
          lostBets: 0,
          winRate: 0,
          peakProfit: 0,
        },
      };
    }

    // 2. Filtrar por período temporal
    let periodBets = resolved;
    if (chartPeriod === '7d' || chartPeriod === '30d') {
      const daysCount = chartPeriod === '7d' ? 7 : 30;
      const nowMs = Date.now();
      const cutoffFromNow = nowMs - daysCount * 86400000;

      const hasRecent = resolved.some((b) => {
        const t = new Date(b.event_date || b.created_at).getTime();
        return t >= cutoffFromNow;
      });

      let cutoffMs = cutoffFromNow;
      if (!hasRecent) {
        const latestTime = Math.max(
          ...resolved.map((b) => new Date(b.event_date || b.created_at).getTime())
        );
        cutoffMs = latestTime - (daysCount - 1) * 86400000;
      }

      periodBets = resolved.filter((b) => {
        const t = new Date(b.event_date || b.created_at).getTime();
        return t >= cutoffMs;
      });

      if (periodBets.length === 0) {
        periodBets = resolved.slice(-daysCount);
      }
    }

    // 3. Agrupar beneficio y estadísticas por día
    const dailyMap = new Map<
      string,
      {
        dailyProfit: number;
        valueProfit: number;
        matchedProfit: number;
        betCount: number;
        wonCount: number;
        lostCount: number;
        stake: number;
      }
    >();

    for (const b of periodBets) {
      const rawDate = b.event_date || b.created_at;
      const dateStr = rawDate.split('T')[0];
      const cur = dailyMap.get(dateStr) || {
        dailyProfit: 0,
        valueProfit: 0,
        matchedProfit: 0,
        betCount: 0,
        wonCount: 0,
        lostCount: 0,
        stake: 0,
      };

      const profit = b.profit || 0;
      cur.dailyProfit += profit;
      cur.stake += b.stake || 0;
      cur.betCount += 1;
      if (b.status === 'won') cur.wonCount += 1;
      if (b.status === 'lost') cur.lostCount += 1;

      if (b.category === 'matched') {
        cur.matchedProfit += profit;
      } else {
        cur.valueProfit += profit;
      }

      dailyMap.set(dateStr, cur);
    }

    const sortedDates = Array.from(dailyMap.keys()).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const months = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
    ];
    const fullMonths = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];

    let cumulative = 0;
    let peak = -Infinity;
    const points: Array<{
      date: string;
      formattedDate: string;
      fullDate: string;
      dailyProfit: number;
      cumulativeProfit: number;
      betCount: number;
      wonCount: number;
      lostCount: number;
      valueProfit: number;
      matchedProfit: number;
    }> = [];

    for (const dateStr of sortedDates) {
      const d = dailyMap.get(dateStr)!;
      cumulative += d.dailyProfit;
      if (cumulative > peak) peak = cumulative;

      const [year, month, day] = dateStr.split('-');
      const mIdx = parseInt(month, 10) - 1;
      const formattedDate = `${parseInt(day, 10)} ${months[mIdx] || month}`;
      const fullDate = `${parseInt(day, 10)} de ${fullMonths[mIdx] || month}, ${year}`;

      points.push({
        date: dateStr,
        formattedDate,
        fullDate,
        dailyProfit: Number(d.dailyProfit.toFixed(2)),
        cumulativeProfit: Number(cumulative.toFixed(2)),
        betCount: d.betCount,
        wonCount: d.wonCount,
        lostCount: d.lostCount,
        valueProfit: Number(d.valueProfit.toFixed(2)),
        matchedProfit: Number(d.matchedProfit.toFixed(2)),
      });
    }

    const periodProfit = periodBets.reduce((acc, b) => acc + (b.profit || 0), 0);
    const periodStake = periodBets.reduce((acc, b) => acc + (b.stake || 0), 0);
    const wonCount = periodBets.filter((b) => b.status === 'won').length;
    const lostCount = periodBets.filter((b) => b.status === 'lost').length;
    const totalCount = wonCount + lostCount;
    const winRate = totalCount > 0 ? Number(((wonCount / totalCount) * 100).toFixed(1)) : 0;
    const periodRoi = periodStake > 0 ? Number(((periodProfit / periodStake) * 100).toFixed(2)) : 0;

    return {
      chartData: points,
      chartMetrics: {
        periodProfit: Number(periodProfit.toFixed(2)),
        periodStake: Number(periodStake.toFixed(2)),
        periodRoi,
        totalBets: periodBets.length,
        wonBets: wonCount,
        lostBets: lostCount,
        winRate,
        peakProfit: peak === -Infinity ? 0 : Number(peak.toFixed(2)),
      },
    };
  }, [bets, chartPeriod, chartStrategy]);

  const filteredBetsForBookmaker = React.useMemo(() => {
    if (bookmakerMode === 'value') {
      return bets.filter((b) => !b.category || b.category === 'value');
    }
    if (bookmakerMode === 'matched') {
      return bets.filter((b) => b.category === 'matched');
    }
    return bets;
  }, [bets, bookmakerMode]);

  // Lista de meses disponibles ordenada descendentemente a partir de las apuestas
  const availableMonths = React.useMemo(() => {
    const monthsMap = new Map<string, string>();
    const MONTH_NAMES_ES = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    for (const b of bets) {
      const dStr = b.event_date || b.created_at;
      if (!dStr) continue;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthsMap.has(key)) {
        monthsMap.set(key, `${MONTH_NAMES_ES[d.getMonth()]} ${d.getFullYear()}`);
      }
    }

    const sorted = Array.from(monthsMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    return sorted.map(([key, label]) => ({ key, label }));
  }, [bets]);

  // Lista de los últimos 6 meses para visualización en columnas comparativas
  const recentMonthKeys = React.useMemo(() => {
    return availableMonths.slice(0, 6).map((m) => m.key);
  }, [availableMonths]);

  // Se pasan tanto las apuestas filtradas por el modo seleccionado como 'bets' (todo el historial)
  // para asegurar que toda casa que aparezca al menos una vez en el historial esté presente.
  const bookmakerStats = React.useMemo(() => {
    return calculateBookmakerStats(filteredBetsForBookmaker, bets);
  }, [filteredBetsForBookmaker, bets]);

  // Lista procesada con ordenación y búsqueda para la tabla de casas
  const displayedBookmakerStats = React.useMemo(() => {
    let list = [...bookmakerStats];

    if (bookmakerFilterActiveOnly) {
      if (bookmakerSelectedMonth === 'all') {
        list = list.filter((b) => b.betsCount > 0);
      } else {
        list = list.filter((b) => {
          const m = b.monthlyBreakdown?.[bookmakerSelectedMonth];
          return m && m.betsCount > 0;
        });
      }
    }

    if (bookmakerSearch.trim()) {
      const q = bookmakerSearch.toLowerCase().trim();
      list = list.filter((b) => b.bookmaker.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let comparison = 0;
      const mA = bookmakerSelectedMonth !== 'all' ? a.monthlyBreakdown?.[bookmakerSelectedMonth] : null;
      const mB = bookmakerSelectedMonth !== 'all' ? b.monthlyBreakdown?.[bookmakerSelectedMonth] : null;

      const aProfit = mA ? mA.profit : a.profit;
      const bProfit = mB ? mB.profit : b.profit;
      const aBets = mA ? mA.betsCount : a.betsCount;
      const bBets = mB ? mB.betsCount : b.betsCount;
      const aStake = mA ? mA.stake : a.stake;
      const bStake = mB ? mB.stake : b.stake;
      const aRoi = mA ? mA.roi : a.roi;
      const bRoi = mB ? mB.roi : b.roi;

      if (bookmakerSortBy === 'bookmaker') {
        comparison = a.bookmaker.localeCompare(b.bookmaker);
      } else if (bookmakerSortBy === 'betsCount') {
        comparison = aBets - bBets;
      } else if (bookmakerSortBy === 'stake') {
        comparison = aStake - bStake;
      } else if (bookmakerSortBy === 'roi') {
        comparison = aRoi - bRoi;
      } else {
        comparison = aProfit - bProfit;
      }
      return bookmakerSortOrder === 'desc' ? -comparison : comparison;
    });

    return list;
  }, [
    bookmakerStats,
    bookmakerFilterActiveOnly,
    bookmakerSelectedMonth,
    bookmakerSearch,
    bookmakerSortBy,
    bookmakerSortOrder,
  ]);

  // Métricas agregadas de la tabla de casas para la fila de totales
  const bookmakerTotals = React.useMemo(() => {
    let totalBets = 0;
    let totalStake = 0;
    let totalProfit = 0;
    let totalWon = 0;
    let totalResolved = 0;
    let activeInMonthCount = 0;

    for (const stat of bookmakerStats) {
      if (bookmakerSelectedMonth !== 'all') {
        const m = stat.monthlyBreakdown?.[bookmakerSelectedMonth];
        if (m) {
          totalBets += m.betsCount;
          totalStake += m.stake;
          totalProfit += m.profit;
          totalWon += m.wonBets;
          totalResolved += m.wonBets + m.lostBets;
          if (m.betsCount > 0) activeInMonthCount++;
        }
      } else {
        totalBets += stat.betsCount;
        totalStake += stat.stake;
        totalProfit += stat.profit;
        totalWon += stat.wonBets || 0;
        totalResolved += (stat.wonBets || 0) + (stat.lostBets || 0);
        if (stat.betsCount > 0) activeInMonthCount++;
      }
    }

    const avgRoi =
      totalStake > 0 ? Number(((totalProfit / totalStake) * 100).toFixed(2)) : 0;
    const avgWinRate =
      totalResolved > 0
        ? Number(((totalWon / totalResolved) * 100).toFixed(1))
        : 0;

    return {
      totalCount: bookmakerStats.length,
      activeCount: activeInMonthCount,
      totalBets,
      totalStake: Number(totalStake.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      avgRoi,
      avgWinRate,
    };
  }, [bookmakerStats, bookmakerSelectedMonth]);

  const toggleRowExpanded = (bookmaker: string) => {
    setBookmakerExpandedRows((prev) => ({
      ...prev,
      [bookmaker]: !prev[bookmaker],
    }));
  };

  const handleToggleBookmakerSort = (
    col: 'profit' | 'betsCount' | 'stake' | 'roi' | 'bookmaker'
  ) => {
    if (bookmakerSortBy === col) {
      setBookmakerSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setBookmakerSortBy(col);
      setBookmakerSortOrder(col === 'bookmaker' ? 'asc' : 'desc');
    }
  };

  const recentBets = React.useMemo(() => {
    return [...bets]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5);
  }, [bets]);

  // Función para determinar si una apuesta pertenece a una fecha (por event_date o created_at)
  const isBetOnTargetDate = useCallback((b: Bet, targetDate: Date) => {
    const ymd = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    if (b.event_date && b.event_date.startsWith(ymd)) return true;
    if (b.created_at && b.created_at.startsWith(ymd)) return true;
    if (b.created_at) {
      const d = new Date(b.created_at);
      if (
        !isNaN(d.getTime()) &&
        d.getFullYear() === targetDate.getFullYear() &&
        d.getMonth() === targetDate.getMonth() &&
        d.getDate() === targetDate.getDate()
      ) {
        return true;
      }
    }
    if (b.event_date) {
      const d = new Date(b.event_date);
      if (
        !isNaN(d.getTime()) &&
        d.getFullYear() === targetDate.getFullYear() &&
        d.getMonth() === targetDate.getMonth() &&
        d.getDate() === targetDate.getDate()
      ) {
        return true;
      }
    }
    return false;
  }, []);

  const todayDate = React.useMemo(() => new Date(), []);
  const yesterdayDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);

  const todayBets = React.useMemo(() => {
    return bets.filter((b) => isBetOnTargetDate(b, todayDate));
  }, [bets, todayDate, isBetOnTargetDate]);

  const yesterdayBets = React.useMemo(() => {
    return bets.filter((b) => isBetOnTargetDate(b, yesterdayDate));
  }, [bets, yesterdayDate, isBetOnTargetDate]);

  const calculateDayStats = (dayBets: Bet[]) => {
    const profit = dayBets.reduce((acc, b) => {
      if (b.status === 'won' || b.status === 'lost') {
        return acc + (b.profit || 0);
      }
      return acc;
    }, 0);
    const totalStake = dayBets.reduce((acc, b) => acc + (b.stake || 0), 0);
    const wonCount = dayBets.filter((b) => b.status === 'won').length;
    const lostCount = dayBets.filter((b) => b.status === 'lost').length;
    const pendingCount = dayBets.filter((b) => b.status === 'pending').length;
    const voidCount = dayBets.filter((b) => b.status === 'void').length;
    const resolvedCount = wonCount + lostCount;
    const winRate = resolvedCount > 0 ? Number(((wonCount / resolvedCount) * 100).toFixed(1)) : 0;
    const roi = totalStake > 0 ? Number(((profit / totalStake) * 100).toFixed(2)) : 0;

    return {
      profit: Number(profit.toFixed(2)),
      totalStake: Number(totalStake.toFixed(2)),
      wonCount,
      lostCount,
      pendingCount,
      voidCount,
      resolvedCount,
      winRate,
      roi,
      betsCount: dayBets.length,
    };
  };

  const todayStats = React.useMemo(() => calculateDayStats(todayBets), [todayBets]);
  const yesterdayStats = React.useMemo(() => calculateDayStats(yesterdayBets), [yesterdayBets]);

  const activeCardStats = dayCardPeriod === 'today' ? todayStats : yesterdayStats;

  const activeBreakdownStats = breakdownActiveTab === 'today' ? todayStats : yesterdayStats;
  const activeBreakdownBets = breakdownActiveTab === 'today' ? todayBets : yesterdayBets;
  const activeBreakdownDate = breakdownActiveTab === 'today' ? todayDate : yesterdayDate;

  const formatBreakdownDate = (d: Date) => {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return `${dayNames[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
  };

  // Atajo Esc para cerrar el modal de desglose
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDayBreakdownOpen) return;
      if (e.key === 'Escape') {
        setIsDayBreakdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDayBreakdownOpen]);

  const isProfitPositive = metrics.totalProfit >= 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* TARJETA PROMINENTE DE APUESTAS PENDIENTES */}
      {metrics.pendingBets > 0 && (
        <div
          onClick={() => onNavigateToTab('pending')}
          className="group cursor-pointer p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-zinc-900 border border-amber-500/40 hover:border-amber-400 shadow-lg shadow-amber-500/5 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  Apuestas por resolver
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-extrabold text-xs">
                  Pendientes ({metrics.pendingBets})
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 mt-0.5">
                Resuelve en racha con 1 solo clic o atajos <kbd className="px-1 py-0.5 bg-zinc-800 text-emerald-400 rounded text-xs">1</kbd> / <kbd className="px-1 py-0.5 bg-zinc-800 text-rose-400 rounded text-xs">2</kbd>. El beneficio se actualizará al instante.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform shrink-0">
            <span>Ir a Pendientes</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Desglose de Beneficios por Estrategia: Apuestas de Valor vs Matched Betting */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <span>Desglose de Beneficios por Estrategia</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300 font-normal">
              Valor vs. Matched Betting
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Beneficio Total Combinado */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <span>Beneficio Total Combinado</span>
              </div>
              <div
                className={`text-xl sm:text-2xl font-bold font-mono ${
                  strategyStats.total.totalProfit >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {strategyStats.total.totalProfit >= 0 ? '+' : ''}
                {strategyStats.total.totalProfit.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </div>
              <div className="text-[11px] text-zinc-400">
                Balance en caja •{' '}
                <strong className="text-zinc-200">
                  {strategyStats.total.totalBets}
                </strong>{' '}
                registros
              </div>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                strategyStats.total.totalProfit >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {strategyStats.total.totalProfit >= 0 ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownRight className="w-5 h-5" />
              )}
            </div>
          </div>

          {/* 2. Beneficio de Hoy / Ayer (con selector rápido y desglose interactivo) */}
          <div
            onClick={() => {
              setBreakdownActiveTab(dayCardPeriod);
              setIsDayBreakdownOpen(true);
            }}
            className="group cursor-pointer p-3.5 rounded-xl bg-zinc-950/80 border border-sky-500/30 hover:border-sky-500/60 hover:bg-zinc-950/95 transition-all shadow-sm hover:shadow-sky-500/10 flex items-center justify-between relative"
            title="Haz clic para ver el desglose detallado de apuestas de hoy o ayer"
          >
            <div className="space-y-1 w-full mr-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{dayCardPeriod === 'today' ? 'Beneficio Hoy' : 'Beneficio Ayer'}</span>
                </div>
                {/* Botón pequeño para alternar ver hoy o ayer */}
                <div
                  className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-inner"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setDayCardPeriod('today')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      dayCardPeriod === 'today'
                        ? 'bg-sky-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Ver beneficio de hoy"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayCardPeriod('yesterday')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      dayCardPeriod === 'yesterday'
                        ? 'bg-sky-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Ver beneficio de ayer"
                  >
                    Ayer
                  </button>
                </div>
              </div>

              <div
                className={`text-xl sm:text-2xl font-bold font-mono ${
                  activeCardStats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {activeCardStats.profit >= 0 ? '+' : ''}
                {activeCardStats.profit.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>
                  {dayCardPeriod === 'today' ? 'Hoy' : 'Ayer'} •{' '}
                  <strong className="text-zinc-200">
                    {activeCardStats.betsCount}
                  </strong>{' '}
                  {activeCardStats.betsCount === 1 ? 'apuesta' : 'apuestas'}
                </span>
                <span className="text-[10px] text-sky-400 group-hover:text-sky-300 font-semibold flex items-center gap-0.5 transition">
                  Ver desglose <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>

            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                activeCardStats.profit >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {activeCardStats.profit >= 0 ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownRight className="w-5 h-5" />
              )}
            </div>
          </div>

          {/* 3. Apuestas de Valor (+EV) */}
          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-emerald-500/20 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
                <span>Apuestas de Valor (+EV)</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                {strategyStats.valueBets.totalProfit >= 0 ? '+' : ''}
                {strategyStats.valueBets.totalProfit.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </div>
              <div className="text-[11px] text-zinc-400">
                ROI{' '}
                <strong
                  className={
                    strategyStats.valueBets.roi >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }
                >
                  {strategyStats.valueBets.roi}%
                </strong>{' '}
                • {strategyStats.valueCount} apuestas
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* 3. Matched Betting / Promos */}
          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-indigo-500/30 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <Gift className="w-3.5 h-3.5" />
                <span>Matched Betting / Promos</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-indigo-300 font-mono">
                {strategyStats.matchedBets.totalProfit >= 0 ? '+' : ''}
                {strategyStats.matchedBets.totalProfit.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </div>
              <div className="text-[11px] text-zinc-400">
                <span className="text-indigo-400 font-medium">Libre de riesgo</span> •{' '}
                {strategyStats.matchedCount} bonos
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Gift className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Barra horizontal de una sola línea con rotación cada 5s y modal de detalle */}
        <AccountInsightsTicker bets={bets} />
      </div>

      {/* Panel Unificado: Estadísticas apuestas de valor */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <span>Estadísticas apuestas de valor</span>
          </h3>
        </div>

        {/* Grid Principal de KPIs con comparativas estilo Stripe / Linear */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Beneficio Total */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700/80 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">
                Beneficio Total
              </span>
              <div
                className={`p-1.5 rounded-lg ${
                  isProfitPositive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {isProfitPositive ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="mt-2">
              <div
                className={`text-2xl sm:text-3xl font-bold tracking-tight leading-none ${
                  isProfitPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isProfitPositive ? '+' : ''}
                {metrics.totalProfit.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </div>
              <div className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-1 font-medium">
                <span className={comp.profitLast30 >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {comp.profitLast30 >= 0 ? '+' : ''}
                  {comp.profitLast30}€
                </span>
                <span>en últimos 30 días</span>
              </div>
            </div>
          </div>

          {/* 2. ROI % */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700/80 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">
                ROI %
              </span>
              <div
                className={`p-1.5 rounded-lg ${
                  metrics.roi >= 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div
                className={`text-2xl sm:text-3xl font-bold tracking-tight leading-none ${
                  metrics.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {metrics.roi >= 0 ? '+' : ''}
                {metrics.roi} %
              </div>
              <div className="text-[11px] text-zinc-400 mt-1.5 font-medium">
                <span className={comp.roiDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {comp.roiDiff >= 0 ? '↑ +' : '↓ '}
                  {comp.roiDiff}%
                </span>{' '}
                <span>vs periodo anterior</span>
              </div>
            </div>
          </div>

          {/* 3. Win Rate */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700/80 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">
                Win Rate
              </span>
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
                {metrics.winRate} %
              </div>
              <div className="text-[11px] text-zinc-400 mt-1.5 font-medium">
                {comp.currentStreak > 0 ? (
                  <span>
                    Racha activa:{' '}
                    <strong
                      className={
                        comp.streakType === 'W'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }
                    >
                      {comp.currentStreak}
                      {comp.streakType}
                    </strong>
                  </span>
                ) : (
                  <span>
                    <span className="text-emerald-400 font-medium">
                      {metrics.wonBets}W
                    </span>{' '}
                    -{' '}
                    <span className="text-rose-400 font-medium">
                      {metrics.lostBets}L
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Total Apostado (Stake) */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700/80 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">
                Total Apostado
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-bold text-zinc-200 tracking-tight leading-none">
                {metrics.totalStake.toLocaleString('es-ES', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </div>
              <div className="text-[11px] text-zinc-400 mt-1.5 font-medium">
                Stake medio:{' '}
                <span className="text-white font-mono font-bold">
                  {comp.avgStake}€
                </span>
              </div>
            </div>
          </div>

          {/* 5. Apuestas Totales & Pendientes */}
          <div className="col-span-2 sm:col-span-1 bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700/80 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">
                Apuestas
              </span>
              <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300">
                <BarChart2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none flex items-baseline gap-1.5">
                <span>{metrics.totalBets}</span>
                <span className="text-xs font-normal text-zinc-400">
                  ({metrics.pendingBets} pend.)
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-1.5 flex items-center justify-between">
                <span>{metrics.wonBets} ganadas</span>
                <span>•</span>
                <span>{metrics.lostBets} perdidas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Secundario: Gráfica de Evolución + Historial Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfica Evolución Beneficio Acumulado (8 columnas) */}
        <div className="lg:col-span-8 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Cabecera del Gráfico: Título y Controles */}
            <div className="flex flex-col gap-4 mb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    {chartStrategy === 'matched' ? (
                      <Gift className="w-5 h-5 text-indigo-400" />
                    ) : chartStrategy === 'value' ? (
                      <Zap className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    )}
                    <span>Evolución del Beneficio Acumulado</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {chartStrategy === 'matched'
                      ? 'Rendimiento exclusivo de Matched Betting y bonos'
                      : chartStrategy === 'value'
                      ? 'Rendimiento exclusivo de Apuestas de Valor (+EV)'
                      : 'Curva de beneficio acumulado total (Valor + Matched Betting)'}
                  </p>
                </div>

                {/* Selector de periodo: 7 días, 30 días, Todo */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 self-start sm:self-auto shrink-0">
                  {[
                    { id: '7d', label: '7 días' },
                    { id: '30d', label: '30 días' },
                    { id: 'all', label: 'Todo' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setChartPeriod(p.id as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        chartPeriod === p.id
                          ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de estrategia / tipo de ganancias */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/60">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mr-1">
                  Ganancias:
                </span>
                <button
                  onClick={() => setChartStrategy('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                    chartStrategy === 'all'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950'
                      : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Total Combinado</span>
                </button>

                <button
                  onClick={() => setChartStrategy('value')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                    chartStrategy === 'value'
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-950'
                      : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Solo Valor (+EV)</span>
                </button>

                <button
                  onClick={() => setChartStrategy('matched')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                    chartStrategy === 'matched'
                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/50 shadow-sm shadow-indigo-950'
                      : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Solo Matched Betting</span>
                </button>
              </div>

              {/* Franja de Métricas Resumen del Período y Filtro seleccionado */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                    Beneficio en período
                  </span>
                  <div
                    className={`text-sm sm:text-base font-bold font-mono mt-0.5 ${
                      chartMetrics.periodProfit >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {chartMetrics.periodProfit >= 0 ? '+' : ''}
                    {chartMetrics.periodProfit.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                    })}
                    €
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                    ROI del período
                  </span>
                  <div
                    className={`text-sm sm:text-base font-bold font-mono mt-0.5 ${
                      chartMetrics.periodRoi >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {chartMetrics.periodStake === 0 && chartStrategy === 'matched'
                      ? '100% (Free)'
                      : `${chartMetrics.periodRoi >= 0 ? '+' : ''}${chartMetrics.periodRoi}%`}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                    Tasa de Acierto
                  </span>
                  <div className="text-sm sm:text-base font-bold text-white mt-0.5 flex items-baseline gap-1.5">
                    <span>{chartMetrics.winRate}%</span>
                    <span className="text-[10px] font-normal text-zinc-400">
                      ({chartMetrics.wonBets}G/{chartMetrics.lostBets}P)
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                    Pico Máximo
                  </span>
                  <div className="text-sm sm:text-base font-bold font-mono text-zinc-200 mt-0.5">
                    {chartMetrics.peakProfit >= 0 ? '+' : ''}
                    {chartMetrics.peakProfit.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                    })}
                    €
                  </div>
                </div>
              </div>
            </div>

            {/* Área del Gráfico Recharts */}
            <div className="h-[270px] sm:h-[310px] w-full mt-2">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      {/* Gradiente para Total Combinado */}
                      <linearGradient
                        id="profitGradientAll"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0.0}
                        />
                      </linearGradient>

                      {/* Gradiente para Solo Valor */}
                      <linearGradient
                        id="profitGradientValue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#06b6d4"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#06b6d4"
                          stopOpacity={0.0}
                        />
                      </linearGradient>

                      {/* Gradiente para Solo Matched Betting */}
                      <linearGradient
                        id="profitGradientMatched"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#818cf8"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#818cf8"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#27272a"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="formattedDate"
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                    />

                    <YAxis
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${val}€`}
                    />

                    {/* Línea de flotación 0€ */}
                    <ReferenceLine
                      y={0}
                      stroke="#3f3f46"
                      strokeDasharray="3 3"
                    />

                    <Tooltip
                      content={
                        <CustomTooltip
                          showBreakdown={chartStrategy === 'all'}
                          strategy={chartStrategy}
                        />
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="cumulativeProfit"
                      stroke={
                        chartStrategy === 'matched'
                          ? '#818cf8'
                          : chartStrategy === 'value'
                          ? '#06b6d4'
                          : '#10b981'
                      }
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill={
                        chartStrategy === 'matched'
                          ? 'url(#profitGradientMatched)'
                          : chartStrategy === 'value'
                          ? 'url(#profitGradientValue)'
                          : 'url(#profitGradientAll)'
                      }
                      activeDot={{
                        r: 5,
                        stroke:
                          chartStrategy === 'matched'
                            ? '#818cf8'
                            : chartStrategy === 'value'
                            ? '#06b6d4'
                            : '#10b981',
                        strokeWidth: 2,
                        fill: '#09090b',
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center text-zinc-500 py-8">
                  <BarChart2 className="w-10 h-10 mb-2 opacity-40 text-zinc-400" />
                  <p className="text-sm font-semibold text-zinc-300">
                    No hay apuestas resueltas para este filtro
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                    {chartStrategy === 'matched'
                      ? 'No hay registros resueltos de Matched Betting en este periodo.'
                      : chartStrategy === 'value'
                      ? 'No hay registros resueltos de Apuestas de Valor en este periodo.'
                      : 'No hay apuestas resueltas registradas en este periodo.'}
                  </p>
                  <button
                    onClick={() => {
                      setChartPeriod('all');
                      setChartStrategy('all');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
                  >
                    Ver Todo el Histórico
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Historial Reciente (4 columnas) */}
        <div className="lg:col-span-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">
                Apuestas Recientes
              </h2>
              <button
                onClick={() => onNavigateToTab('history')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-0.5"
              >
                <span>Ver todo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {recentBets.length > 0 ? (
                recentBets.map((bet) => {
                  const isWon = bet.status === 'won';
                  const isLost = bet.status === 'lost';
                  const isPending = bet.status === 'pending';

                  return (
                    <div
                      key={bet.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-zinc-700/60 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isWon
                              ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                              : isLost
                              ? 'bg-rose-500'
                              : 'bg-amber-400 animate-pulse'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {bet.event || `${bet.sport || 'Deporte'} • ${bet.bookmaker}`}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5">
                            {bet.category === 'matched' ? (
                              <>
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30 text-[10px]">
                                  🎁 Matched
                                </span>
                                <span>{bet.bookmaker} • Promoción / Bono</span>
                              </>
                            ) : (
                              <span>
                                {bet.bookmaker} • Stake {bet.stake}€ • @
                                <span className="font-mono">{bet.odds}</span>
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        {isWon && (
                          <span className="text-sm font-bold font-mono text-emerald-400">
                            +{bet.profit.toFixed(2)}€
                          </span>
                        )}
                        {isLost && (
                          <span className="text-sm font-bold font-mono text-rose-400">
                            {bet.profit.toFixed(2)}€
                          </span>
                        )}
                        {isPending && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            Pendiente
                          </span>
                        )}
                        {bet.status === 'void' && (
                          <span className="text-xs text-zinc-400">Nula</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center text-zinc-500 text-sm">
                  No hay apuestas registradas aún.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Total resuelto: <strong className="text-white">{metrics.resolvedBets}</strong>
            </span>
            <span>
              Win Rate: <strong className="text-emerald-400">{metrics.winRate}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Sección Completa: Rendimiento por Casa de Apuestas con Desglose Mensual */}
      <div className="w-full">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 md:p-6 flex flex-col justify-between shadow-sm">
          <div>
            {/* Cabecera, Título y Selectores */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    Rendimiento por Casa de Apuestas
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {bookmakerTotals.totalCount}{' '}
                  {bookmakerTotals.totalCount === 1
                    ? 'casa registrada'
                    : 'casas registradas'}{' '}
                  en tu historial
                  {bookmakerTotals.activeCount < bookmakerTotals.totalCount && (
                    <span> • {bookmakerTotals.activeCount} con actividad {bookmakerSelectedMonth !== 'all' ? 'en este mes' : 'en este modo'}</span>
                  )}
                  {bookmakerSelectedMonth !== 'all' && (
                    <span className="text-emerald-400 font-medium">
                      {' '}• Filtrado por mes:{' '}
                      {availableMonths.find((m) => m.key === bookmakerSelectedMonth)?.label || bookmakerSelectedMonth}
                    </span>
                  )}
                </p>
              </div>

              {/* Controles: Estrategia y Filtro de Mes */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Selector de Mes */}
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1.5 rounded-xl border border-zinc-800 text-xs">
                  <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-400 font-medium hidden sm:inline">Mes:</span>
                  <select
                    value={bookmakerSelectedMonth}
                    onChange={(e) => setBookmakerSelectedMonth(e.target.value)}
                    className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs pr-1"
                  >
                    <option value="all" className="bg-zinc-900 text-white">
                      Todos los meses (Histórico)
                    </option>
                    {availableMonths.map((m) => (
                      <option key={m.key} value={m.key} className="bg-zinc-900 text-white">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de estrategia */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
                  {[
                    { id: 'value', label: 'Apuestas de Valor', icon: Zap },
                    { id: 'matched', label: 'Matched Betting', icon: Gift },
                    { id: 'all', label: 'Global', icon: Layers },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = bookmakerMode === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setBookmakerMode(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          isActive
                            ? tab.id === 'matched'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                              : tab.id === 'value'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Barra de Búsqueda, Filtros y Botón de Resumen Mensual */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3.5">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={bookmakerSearch}
                    onChange={(e) => setBookmakerSearch(e.target.value)}
                    placeholder="Buscar casa de apuestas..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                  />
                  {bookmakerSearch && (
                    <button
                      type="button"
                      onClick={() => setBookmakerSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Toggle de solo casas con actividad */}
                <button
                  type="button"
                  onClick={() => setBookmakerFilterActiveOnly((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
                    bookmakerFilterActiveOnly
                      ? 'bg-zinc-800 text-white border-zinc-700'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                  title={
                    bookmakerFilterActiveOnly
                      ? 'Mostrando solo casas con apuestas en este período'
                      : 'Mostrando todas las casas del historial'
                  }
                >
                  <Filter className="w-3 h-3" />
                  <span>{bookmakerFilterActiveOnly ? 'Con actividad' : 'Todas las casas'}</span>
                </button>
              </div>

              {/* Píldoras de meses rápidos si hay más de un mes disponible */}
              {availableMonths.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs text-zinc-400">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider shrink-0 font-medium">
                    Mes rápido:
                  </span>
                  <button
                    type="button"
                    onClick={() => setBookmakerSelectedMonth('all')}
                    className={`px-2.5 py-1 rounded-md text-xs transition shrink-0 ${
                      bookmakerSelectedMonth === 'all'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'hover:bg-zinc-800/50 hover:text-zinc-200'
                    }`}
                  >
                    Histórico
                  </button>
                  {availableMonths.slice(0, 4).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setBookmakerSelectedMonth(m.key)}
                      className={`px-2.5 py-1 rounded-md text-xs transition shrink-0 ${
                        bookmakerSelectedMonth === 'key' || bookmakerSelectedMonth === m.key
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                          : 'hover:bg-zinc-800/50 hover:text-zinc-200'
                      }`}
                    >
                      {m.label.split(' ')[0]} {m.label.split(' ')[1]?.slice(-2)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tabla Principal con columnas extendidas para meses y detalle expandible */}
            <div className="overflow-x-auto border border-zinc-800/60 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 text-zinc-400 font-semibold z-10">
                  <tr>
                    <th className="py-3 pl-3 w-10 text-center">
                      <span className="sr-only">Desplegar</span>
                    </th>
                    <th className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => handleToggleBookmakerSort('bookmaker')}
                        className="flex items-center gap-1 hover:text-white transition font-semibold"
                      >
                        <span>Casa de Apuestas</span>
                        {bookmakerSortBy === 'bookmaker' ? (
                          bookmakerSortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleBookmakerSort('betsCount')}
                        className="flex items-center gap-1 justify-end ml-auto hover:text-white transition font-semibold"
                      >
                        <span>
                          {bookmakerSelectedMonth !== 'all'
                            ? `Apuestas (${availableMonths.find((m) => m.key === bookmakerSelectedMonth)?.label.split(' ')[0] || ''})`
                            : bookmakerMode === 'matched'
                            ? 'Bonos'
                            : 'Apuestas'}
                        </span>
                        {bookmakerSortBy === 'betsCount' ? (
                          bookmakerSortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleBookmakerSort('stake')}
                        className="flex items-center gap-1 justify-end ml-auto hover:text-white transition font-semibold"
                      >
                        <span>Stake</span>
                        {bookmakerSortBy === 'stake' ? (
                          bookmakerSortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleBookmakerSort('roi')}
                        className="flex items-center gap-1 justify-end ml-auto hover:text-white transition font-semibold"
                      >
                        <span>ROI %</span>
                        {bookmakerSortBy === 'roi' ? (
                          bookmakerSortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>

                    {/* Columnas compactas de meses recientes para vista panorámica mensual */}
                    {recentMonthKeys.length > 0 && (
                      <th className="py-3 px-3 text-center hidden md:table-cell">
                        <span className="font-semibold text-zinc-300">
                          Beneficio por Meses
                        </span>
                      </th>
                    )}

                    <th className="py-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleBookmakerSort('profit')}
                        className="flex items-center gap-1 justify-end ml-auto hover:text-white transition font-semibold"
                      >
                        <span>
                          {bookmakerSelectedMonth !== 'all'
                            ? `Beneficio (${availableMonths.find((m) => m.key === bookmakerSelectedMonth)?.label.split(' ')[0] || ''})`
                            : 'Beneficio Total'}
                        </span>
                        {bookmakerSortBy === 'profit' ? (
                          bookmakerSortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {displayedBookmakerStats.length > 0 ? (
                    displayedBookmakerStats.map((stat) => {
                      const isExpanded = !!bookmakerExpandedRows[stat.bookmaker];
                      const monthlyEntries = (
                        Object.values(
                          stat.monthlyBreakdown || {}
                        ) as BookmakerMonthlyBreakdown[]
                      ).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
                      const hasMonthlyData = monthlyEntries.length > 0;

                      // Valores para la fila activa (según mes seleccionado o total)
                      const targetMonthly =
                        bookmakerSelectedMonth !== 'all'
                          ? stat.monthlyBreakdown?.[bookmakerSelectedMonth]
                          : null;

                      const activeBetsCount = targetMonthly ? targetMonthly.betsCount : stat.betsCount;
                      const activeStake = targetMonthly ? targetMonthly.stake : stat.stake;
                      const activeProfit = targetMonthly ? targetMonthly.profit : stat.profit;
                      const activeRoi = targetMonthly ? targetMonthly.roi : stat.roi;
                      const activeWon = targetMonthly ? targetMonthly.wonBets : stat.wonBets || 0;
                      const activeLost = targetMonthly ? targetMonthly.lostBets : stat.lostBets || 0;

                      const pos = activeProfit >= 0;
                      const hasBets = activeBetsCount > 0;
                      const isFreebetBono =
                        bookmakerMode === 'matched' &&
                        activeStake === 0 &&
                        activeProfit > 0;

                      return (
                        <React.Fragment key={stat.bookmaker}>
                          <tr
                            className={`hover:bg-zinc-800/40 transition group ${
                              !hasBets ? 'opacity-40 hover:opacity-75' : ''
                            } ${isExpanded ? 'bg-zinc-800/30' : ''}`}
                          >
                            {/* Botón expandir meses */}
                            <td className="py-3 pl-3 text-center">
                              {hasMonthlyData ? (
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpanded(stat.bookmaker)}
                                  className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition"
                                  title="Ver beneficio dividido por meses"
                                >
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                      isExpanded ? 'rotate-180 text-emerald-400' : ''
                                    }`}
                                  />
                                </button>
                              ) : (
                                <span className="w-3.5 h-3.5 inline-block text-zinc-700">
                                  •
                                </span>
                              )}
                            </td>

                            {/* Nombre de la casa */}
                            <td className="py-3 pr-4 font-semibold text-white">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm">{stat.bookmaker}</span>
                                {(stat.pendingBets || 0) > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5 font-medium">
                                    <Clock className="w-2.5 h-2.5" />
                                    {stat.pendingBets} pend.
                                  </span>
                                )}
                                {!hasBets && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/70 text-zinc-500 font-normal">
                                    {bookmakerSelectedMonth !== 'all'
                                      ? 'Sin actividad este mes'
                                      : 'Sin apuestas aquí'}
                                  </span>
                                )}
                                {hasMonthlyData && !isExpanded && (
                                  <button
                                    type="button"
                                    onClick={() => toggleRowExpanded(stat.bookmaker)}
                                    className="hidden group-hover:inline-flex items-center text-[10px] text-emerald-400 hover:underline"
                                  >
                                    Ver meses ({monthlyEntries.length})
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Apuestas */}
                            <td className="py-3 px-3 text-right text-zinc-300">
                              {hasBets ? (
                                <div>
                                  <span className="font-semibold">{activeBetsCount}</span>
                                  {(activeWon > 0 || activeLost > 0) && (
                                    <span className="block text-[10px] text-zinc-500">
                                      {activeWon}G / {activeLost}P
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-zinc-600 font-mono">0</span>
                              )}
                            </td>

                            {/* Stake */}
                            <td className="py-3 px-3 text-right font-mono text-zinc-400">
                              {activeStake > 0 ? (
                                `${activeStake.toFixed(2)}€`
                              ) : isFreebetBono ? (
                                <span className="text-indigo-400 font-sans text-[11px]">
                                  Bono
                                </span>
                              ) : hasBets ? (
                                '0.00€'
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>

                            {/* ROI % */}
                            <td
                              className={`py-3 px-3 text-right font-semibold ${
                                !hasBets
                                  ? 'text-zinc-600'
                                  : isFreebetBono
                                  ? 'text-indigo-400'
                                  : activeRoi >= 0
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {!hasBets ? (
                                <span className="font-mono text-zinc-600">—</span>
                              ) : isFreebetBono ? (
                                <span className="text-[11px] font-sans">Bono</span>
                              ) : (
                                `${activeRoi >= 0 ? '+' : ''}${activeRoi}%`
                              )}
                            </td>

                            {/* Chips de Beneficio por Meses (Vista panorámica horizontal) */}
                            {recentMonthKeys.length > 0 && (
                              <td className="py-3 px-3 hidden md:table-cell">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {recentMonthKeys.map((mKey) => {
                                    const mData = stat.monthlyBreakdown?.[mKey];
                                    const mLabel =
                                      availableMonths.find((m) => m.key === mKey)?.label.split(' ')[0] || mKey;
                                    if (!mData || mData.betsCount === 0) {
                                      return (
                                        <div
                                          key={mKey}
                                          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-950/60 text-zinc-600 font-mono"
                                          title={`${mLabel}: Sin apuestas`}
                                        >
                                          <span className="text-zinc-700 mr-0.5">{mLabel.slice(0, 3)}:</span>—
                                        </div>
                                      );
                                    }

                                    const mPos = mData.profit >= 0;
                                    return (
                                      <div
                                        key={mKey}
                                        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono flex items-center gap-1 ${
                                          mPos
                                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                                        }`}
                                        title={`${mLabel}: ${mData.betsCount} apuestas, Stake ${mData.stake}€, ROI ${mData.roi}%`}
                                      >
                                        <span className="text-zinc-400 font-sans font-medium text-[9px]">
                                          {mLabel.slice(0, 3)}:
                                        </span>
                                        <strong>
                                          {mPos ? '+' : ''}
                                          {mData.profit.toFixed(1)}€
                                        </strong>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            )}

                            {/* Beneficio Columna Principal */}
                            <td
                              className={`py-3 pr-4 text-right font-mono font-bold text-sm ${
                                !hasBets
                                  ? 'text-zinc-600 font-normal'
                                  : pos
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {!hasBets
                                ? '0.00€'
                                : `${pos ? '+' : ''}${activeProfit.toFixed(2)}€`}
                            </td>
                          </tr>

                          {/* Fila Acordeón Expandida: Desglose Mensual Detallado de la Casa */}
                          {isExpanded && (
                            <tr className="bg-zinc-950/80 border-y border-zinc-800/80">
                              <td colSpan={recentMonthKeys.length > 0 ? 7 : 6} className="py-3 px-4 pl-11">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-xs font-bold text-zinc-200">
                                        Historial de beneficios por mes en {stat.bookmaker}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-zinc-400">
                                      {monthlyEntries.length} {monthlyEntries.length === 1 ? 'mes registrado' : 'meses registrados'}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
                                    {monthlyEntries.map((m) => {
                                      const isMPos = m.profit >= 0;
                                      const isSelected = bookmakerSelectedMonth === m.monthKey;
                                      return (
                                        <div
                                          key={m.monthKey}
                                          onClick={() => setBookmakerSelectedMonth(m.monthKey)}
                                          className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                                            isSelected
                                              ? 'bg-zinc-900 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                                              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between text-[11px] mb-1">
                                            <span className="font-semibold text-zinc-300">
                                              {m.monthLabel}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 font-mono">
                                              {m.betsCount} ap.
                                            </span>
                                          </div>

                                          <div className="flex items-baseline justify-between gap-1">
                                            <span
                                              className={`text-sm font-bold font-mono ${
                                                isMPos ? 'text-emerald-400' : 'text-rose-400'
                                              }`}
                                            >
                                              {isMPos ? '+' : ''}
                                              {m.profit.toFixed(2)}€
                                            </span>
                                            <span
                                              className={`text-[10px] font-semibold ${
                                                m.roi >= 0 ? 'text-emerald-500' : 'text-rose-500'
                                              }`}
                                            >
                                              {m.roi >= 0 ? '+' : ''}{m.roi}%
                                            </span>
                                          </div>

                                          <div className="text-[10px] text-zinc-500 mt-1 pt-1 border-t border-zinc-800/60 flex justify-between">
                                            <span>Stake: {m.stake.toFixed(0)}€</span>
                                            <span>{m.wonBets}G/{m.lostBets}P</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={recentMonthKeys.length > 0 ? 7 : 6} className="py-12 text-center text-zinc-500">
                        {bookmakerSearch
                          ? `No se encontró ninguna casa que coincida con "${bookmakerSearch}".`
                          : bookmakerSelectedMonth !== 'all'
                          ? 'No hay actividad registrada en este mes para la estrategia seleccionada.'
                          : 'No hay casas registradas en el historial.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fila de Totales / Resumen consolidado */}
          {bookmakerTotals.activeCount > 0 && (
            <div className="mt-4 pt-3.5 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-zinc-300">Balance del período:</span>
                <span className="text-white font-semibold">
                  {bookmakerTotals.activeCount} de {bookmakerTotals.totalCount} casas con actividad (
                  {bookmakerTotals.totalBets}{' '}
                  {bookmakerMode === 'matched' ? 'bonos' : 'apuestas'})
                </span>
                {bookmakerSelectedMonth !== 'all' && (
                  <span className="text-xs text-emerald-400 font-medium">
                    [{availableMonths.find((m) => m.key === bookmakerSelectedMonth)?.label}]
                  </span>
                )}
              </span>
              <div className="flex items-center gap-4 text-right">
                <span className="font-mono">
                  Stake Total:{' '}
                  <strong className="text-zinc-200">
                    {bookmakerTotals.totalStake}€
                  </strong>
                </span>
                <span className="font-mono">
                  ROI Medio:{' '}
                  <strong
                    className={
                      bookmakerTotals.avgRoi >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    {bookmakerTotals.avgRoi >= 0 ? '+' : ''}
                    {bookmakerTotals.avgRoi}%
                  </strong>
                </span>
                <span
                  className={`font-mono font-bold text-sm ${
                    bookmakerTotals.totalProfit >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {bookmakerTotals.totalProfit >= 0 ? '+' : ''}
                  {bookmakerTotals.totalProfit}€
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sección Final: Estadísticas Avanzadas */}
      <AdvancedAnalyticsSection bets={bets} />

      {/* MODAL: Desglose de Ganancias y Pérdidas de Hoy y Ayer */}
      {isDayBreakdownOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsDayBreakdownOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Desglose de Apuestas</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                      {breakdownActiveTab === 'today' ? 'Hoy' : 'Ayer'}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {formatBreakdownDate(activeBreakdownDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDayBreakdownOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas para alternar entre Hoy y Ayer dentro del modal */}
            <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-5 pt-2">
              <button
                type="button"
                onClick={() => setBreakdownActiveTab('today')}
                className={`flex-1 pb-2.5 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${
                  breakdownActiveTab === 'today'
                    ? 'text-sky-400 border-sky-500 bg-sky-500/5'
                    : 'text-zinc-400 border-transparent hover:text-zinc-200'
                }`}
              >
                <span>📅 Hoy</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
                  {todayBets.length}
                </span>
                <span
                  className={`text-[11px] font-mono font-bold ${
                    todayStats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ({todayStats.profit >= 0 ? '+' : ''}{todayStats.profit.toFixed(2)}€)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBreakdownActiveTab('yesterday')}
                className={`flex-1 pb-2.5 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${
                  breakdownActiveTab === 'yesterday'
                    ? 'text-sky-400 border-sky-500 bg-sky-500/5'
                    : 'text-zinc-400 border-transparent hover:text-zinc-200'
                }`}
              >
                <span>📅 Ayer</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
                  {yesterdayBets.length}
                </span>
                <span
                  className={`text-[11px] font-mono font-bold ${
                    yesterdayStats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ({yesterdayStats.profit >= 0 ? '+' : ''}{yesterdayStats.profit.toFixed(2)}€)
                </span>
              </button>
            </div>

            {/* Resumen Métrico Rápido del día seleccionado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-zinc-950/60 border-b border-zinc-800 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                  Beneficio Neto
                </span>
                <span
                  className={`text-base font-extrabold font-mono ${
                    activeBreakdownStats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activeBreakdownStats.profit >= 0 ? '+' : ''}
                  {activeBreakdownStats.profit.toFixed(2)} €
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                  Total Apostado (Stake)
                </span>
                <span className="text-base font-extrabold font-mono text-zinc-200">
                  {activeBreakdownStats.totalStake.toFixed(2)} €
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                  ROI del Día
                </span>
                <span
                  className={`text-base font-extrabold font-mono ${
                    activeBreakdownStats.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activeBreakdownStats.roi >= 0 ? '+' : ''}
                  {activeBreakdownStats.roi}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                  Resultado de Apuestas
                </span>
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 pt-0.5">
                  <span className="text-emerald-400 font-bold">{activeBreakdownStats.wonCount}W</span>
                  <span>•</span>
                  <span className="text-rose-400 font-bold">{activeBreakdownStats.lostCount}L</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">{activeBreakdownStats.pendingCount}P</span>
                  {activeBreakdownStats.voidCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-zinc-400">{activeBreakdownStats.voidCount}N</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Listado de apuestas del día */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {activeBreakdownBets.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400">
                    <Calendar className="w-6 h-6 text-zinc-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-300">
                      No hay apuestas registradas en {breakdownActiveTab === 'today' ? 'hoy' : 'ayer'}
                    </h4>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                      Las apuestas que añadas para esta fecha o creadas en este día aparecerán desglosadas aquí con su beneficio individual.
                    </p>
                  </div>
                  {onOpenNewBet && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDayBreakdownOpen(false);
                        onOpenNewBet();
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition flex items-center gap-1.5 mx-auto active:scale-95 shadow-md shadow-emerald-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Añadir Apuesta Ahora</span>
                    </button>
                  )}
                </div>
              ) : (
                activeBreakdownBets.map((b) => {
                  const isWon = b.status === 'won';
                  const isLost = b.status === 'lost';
                  const isPending = b.status === 'pending';
                  const isVoid = b.status === 'void';
                  const isMatched = b.category === 'matched';
                  const potentialProfit = Number((b.stake * (b.odds - 1)).toFixed(2));

                  return (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Información del evento y casa */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-200">
                            {b.bookmaker}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isMatched
                                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            }`}
                          >
                            {isMatched ? '🎁 Matched / Bono' : '📈 Valor (+EV)'}
                          </span>
                          {b.sport && (
                            <span className="text-[11px] text-zinc-400 font-medium">
                              • {b.sport}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {b.created_at
                              ? new Date(b.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-white">
                          {b.event || (isMatched ? 'Bono / Promoción' : 'Apuesta sin evento especificado')}
                        </div>

                        <div className="text-xs text-zinc-400 flex items-center gap-2 font-mono">
                          <span>
                            Cuota: <strong className="text-zinc-200">{b.odds}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Stake: <strong className="text-zinc-200">{b.stake}€</strong>
                          </span>
                        </div>
                      </div>

                      {/* Estado y Ganancia / Pérdida individual */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/80 gap-1.5 shrink-0">
                        {/* Badge de Estado */}
                        <div>
                          {isWon && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Ganada</span>
                            </span>
                          )}
                          {isLost && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              Perdida
                            </span>
                          )}
                          {isPending && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Pendiente</span>
                            </span>
                          )}
                          {isVoid && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Nula
                            </span>
                          )}
                        </div>

                        {/* Cantidad ganada o perdida */}
                        <div className="text-right">
                          {isWon && (
                            <div className="text-base font-extrabold font-mono text-emerald-400">
                              +{(b.profit || 0).toLocaleString('es-ES', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              €
                            </div>
                          )}
                          {isLost && (
                            <div className="text-base font-extrabold font-mono text-rose-400">
                              {(b.profit || 0).toLocaleString('es-ES', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              €
                            </div>
                          )}
                          {isPending && (
                            <div className="text-xs font-mono text-amber-300 font-semibold">
                              0.00 €{' '}
                              <span className="text-[10px] text-zinc-400 font-normal">
                                (Potencial +{potentialProfit}€)
                              </span>
                            </div>
                          )}
                          {isVoid && (
                            <div className="text-xs font-mono text-zinc-400 font-semibold">
                              0.00 € (Devuelta)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pie del modal */}
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
              <span>
                {activeBreakdownBets.length}{' '}
                {activeBreakdownBets.length === 1 ? 'apuesta registrada' : 'apuestas registradas'} en este día
              </span>
              <button
                type="button"
                onClick={() => setIsDayBreakdownOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Tooltip personalizado enriquecido del gráfico para modo oscuro
 */
const CustomTooltip = ({
  active,
  payload,
  showBreakdown,
  strategy,
}: {
  active?: boolean;
  payload?: any[];
  showBreakdown?: boolean;
  strategy?: 'all' | 'value' | 'matched';
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPos = data.cumulativeProfit >= 0;
    const isDailyPos = data.dailyProfit >= 0;

    return (
      <div className="bg-zinc-950/95 border border-zinc-700/80 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 backdrop-blur-md min-w-[210px]">
        {/* Fecha cabecera */}
        <div className="border-b border-zinc-800 pb-1.5 flex items-center justify-between gap-2">
          <span className="font-bold text-zinc-200">
            {data.fullDate || data.formattedDate}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
            {data.betCount} {data.betCount === 1 ? 'apuesta' : 'apuestas'}
          </span>
        </div>

        {/* Beneficio del Día */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400 font-medium">Beneficio del día:</span>
          <span
            className={`font-mono font-bold text-sm ${
              isDailyPos ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isDailyPos ? '+' : ''}
            {data.dailyProfit}€
          </span>
        </div>

        {/* Desglose por estrategia (si está en Total Combinado) */}
        {showBreakdown && (data.valueProfit !== 0 || data.matchedProfit !== 0) && (
          <div className="bg-zinc-900/80 rounded-lg p-2 space-y-1 border border-zinc-800/60 text-[11px]">
            {data.valueProfit !== 0 && (
              <div className="flex items-center justify-between text-zinc-300">
                <span className="flex items-center gap-1 text-cyan-400">
                  <Zap className="w-3 h-3" />
                  <span>Valor:</span>
                </span>
                <span className="font-mono font-semibold">
                  {data.valueProfit >= 0 ? '+' : ''}
                  {data.valueProfit}€
                </span>
              </div>
            )}
            {data.matchedProfit !== 0 && (
              <div className="flex items-center justify-between text-zinc-300">
                <span className="flex items-center gap-1 text-indigo-400">
                  <Gift className="w-3 h-3" />
                  <span>Matched:</span>
                </span>
                <span className="font-mono font-semibold">
                  {data.matchedProfit >= 0 ? '+' : ''}
                  {data.matchedProfit}€
                </span>
              </div>
            )}
          </div>
        )}

        {/* Beneficio acumulado total */}
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-zinc-800/60">
          <span className="text-zinc-400 font-medium">Acumulado total:</span>
          <span
            className={`font-mono font-bold text-sm ${
              isPos ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPos ? '+' : ''}
            {data.cumulativeProfit}€
          </span>
        </div>

        {/* Resumen aciertos del día */}
        <div className="text-[10px] text-zinc-500 flex items-center justify-between">
          <span>{data.wonCount || 0} ganada{(data.wonCount || 0) !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{data.lostCount || 0} perdida{(data.lostCount || 0) !== 1 ? 's' : ''}</span>
        </div>
      </div>
    );
  }
  return null;
};
