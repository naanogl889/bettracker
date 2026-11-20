import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Gift,
  Landmark,
  Layers,
  ShieldAlert,
  Target,
  X,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Bet, DailyHeatmapDay } from '../types/bets';
import {
  calculateAdvancedBookmakerInsights,
  calculateDailyHeatmapData,
  calculateOddsRangeStats,
  calculateRiskAndStreakMetrics,
  calculateWeekdayStats,
  extractStableYMD,
  parseLocalDateFromYMD,
} from '../utils/metrics';
import {
  BookmakerAuditModal,
  getBookmakerBrandVisual,
} from './BookmakerAuditModal';

interface AdvancedAnalyticsSectionProps {
  bets: Bet[];
}

type StrategyFilter = 'all' | 'value' | 'matched';

function formatEuro(val: number, showPlus = true): string {
  const prefix = showPlus && val > 0 ? '+' : '';
  return `${prefix}${val.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function formatCompactDayEuro(val: number): string {
  const rounded = Number(val.toFixed(2));
  const abs = Math.abs(rounded);
  const str = Number.isInteger(abs)
    ? String(abs)
    : abs.toFixed(2).replace(/(\.\d)0$/, '$1');
  if (rounded > 0) return `+${str}€`;
  if (rounded < 0) return `-${str}€`;
  return '0€';
}

function formatYMDHuman(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  const months = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  return `${d} ${months[m - 1] || m} ${y}`;
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const AdvancedAnalyticsSection: React.FC<AdvancedAnalyticsSectionProps> = ({
  bets,
}) => {
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>('all');
  const [selectedDay, setSelectedDay] = useState<DailyHeatmapDay | null>(null);
  const [selectedEmptyDate, setSelectedEmptyDate] = useState<string | null>(null);

  // 1. Filtrar apuestas por estrategia seleccionada
  const filteredBets = useMemo(() => {
    if (strategyFilter === 'value') {
      return bets.filter((b) => !b.category || b.category === 'value');
    }
    if (strategyFilter === 'matched') {
      return bets.filter((b) => b.category === 'matched');
    }
    return bets;
  }, [bets, strategyFilter]);

  const resolvedBets = useMemo(
    () => filteredBets.filter((b) => b.status === 'won' || b.status === 'lost'),
    [filteredBets]
  );

  // 2. Cálculos analíticos
  const riskMetrics = useMemo(
    () => calculateRiskAndStreakMetrics(filteredBets),
    [filteredBets]
  );

  const heatmapMap = useMemo(
    () => calculateDailyHeatmapData(filteredBets),
    [filteredBets]
  );

  const oddsStats = useMemo(
    () => calculateOddsRangeStats(filteredBets),
    [filteredBets]
  );

  const weekdayStats = useMemo(
    () => calculateWeekdayStats(filteredBets),
    [filteredBets]
  );

  const bookmakerInsights = useMemo(
    () => calculateAdvancedBookmakerInsights(filteredBets),
    [filteredBets]
  );

  // Estados y cálculos del Bloque 1 (Inteligencia por Operadores: Histórico / Anual / Mensual)
  const [bookmakerPeriodMode, setBookmakerPeriodMode] = useState<'all' | 'annual' | 'monthly'>('all');
  const [rankingScope, setRankingScope] = useState<'top8' | 'all'>('top8');
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);
  const [selectedAuditBookmaker, setSelectedAuditBookmaker] = useState<string | null>(null);

  const bookmakerAvailableYears = useMemo(() => {
    const years = new Set<string>();
    for (const bet of filteredBets) {
      const ymd = extractStableYMD(bet);
      if (ymd) years.add(ymd.slice(0, 4));
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [filteredBets]);

  const bookmakerAvailableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>();
    for (const bet of filteredBets) {
      const ymd = extractStableYMD(bet);
      if (!ymd) continue;
      const mKey = ymd.slice(0, 7);
      if (!monthsMap.has(mKey)) {
        const [yStr, mStr] = mKey.split('-');
        const mIdx = parseInt(mStr, 10) - 1;
        monthsMap.set(mKey, `${MONTH_NAMES_ES[mIdx] || mStr} ${yStr}`);
      }
    }
    return Array.from(monthsMap.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredBets]);

  const [bookmakerSelectedYear, setBookmakerSelectedYear] = useState<string>(() =>
    String(new Date().getFullYear())
  );
  const [bookmakerSelectedMonth, setBookmakerSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (
      bookmakerAvailableYears.length > 0 &&
      !bookmakerAvailableYears.includes(bookmakerSelectedYear)
    ) {
      setBookmakerSelectedYear(bookmakerAvailableYears[0]);
    }
  }, [bookmakerAvailableYears, bookmakerSelectedYear]);

  useEffect(() => {
    if (
      bookmakerAvailableMonths.length > 0 &&
      !bookmakerAvailableMonths.some((m) => m.key === bookmakerSelectedMonth)
    ) {
      setBookmakerSelectedMonth(bookmakerAvailableMonths[0].key);
    }
  }, [bookmakerAvailableMonths, bookmakerSelectedMonth]);

  const bookmakerPeriodBets = useMemo(() => {
    if (bookmakerPeriodMode === 'all') return filteredBets;
    if (bookmakerPeriodMode === 'annual') {
      return filteredBets.filter((bet) => {
        const ymd = extractStableYMD(bet);
        return ymd ? ymd.startsWith(bookmakerSelectedYear) : false;
      });
    }
    return filteredBets.filter((bet) => {
      const ymd = extractStableYMD(bet);
      return ymd ? ymd.startsWith(bookmakerSelectedMonth) : false;
    });
  }, [filteredBets, bookmakerPeriodMode, bookmakerSelectedYear, bookmakerSelectedMonth]);

  const periodBookmakerInsights = useMemo(
    () => calculateAdvancedBookmakerInsights(bookmakerPeriodBets),
    [bookmakerPeriodBets]
  );

  const bookmakerPeriodSummary = useMemo(() => {
    const items = periodBookmakerInsights.items;
    const operatorsCount = items.length;
    const positiveOperators = items.filter(
      (i) => i.resolvedCount > 0 && i.profit > 0.005
    ).length;
    const negativeOperators = items.filter(
      (i) => i.resolvedCount > 0 && i.profit < -0.005
    ).length;

    const resolvedInPeriod = bookmakerPeriodBets.filter(
      (b) => b.status === 'won' || b.status === 'lost'
    );
    const resolvedCount = resolvedInPeriod.length;
    const netProfit = Number(
      resolvedInPeriod.reduce((acc, b) => acc + (b.profit || 0), 0).toFixed(2)
    );
    const totalStake = Number(
      resolvedInPeriod.reduce((acc, b) => acc + (b.stake || 0), 0).toFixed(2)
    );
    const yieldPct =
      totalStake > 0 ? Number(((netProfit / totalStake) * 100).toFixed(1)) : 0;
    const avgStake =
      resolvedCount > 0 ? Number((totalStake / resolvedCount).toFixed(2)) : 0;

    // Calcular frecuencia semanal (ap/sem) y media mensual de capital (€/mes)
    const ymds = bookmakerPeriodBets
      .map(extractStableYMD)
      .filter((v): v is string => Boolean(v))
      .sort((a, b) => a.localeCompare(b));

    let betsPerWeek = 0;
    let monthlyStakeAvg = 0;

    if (ymds.length > 0) {
      const firstDate = parseLocalDateFromYMD(ymds[0]);
      const lastDate = parseLocalDateFromYMD(ymds[ymds.length - 1]);
      const diffDays = Math.max(
        1,
        Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      );
      const weeks = Math.max(1, diffDays / 7);
      betsPerWeek = Number((bookmakerPeriodBets.length / weeks).toFixed(1));

      const monthSpan = Math.max(
        1,
        (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
          (lastDate.getMonth() - firstDate.getMonth()) +
          1
      );
      monthlyStakeAvg = Math.round(totalStake / monthSpan);
    }

    const activeMonthObj = bookmakerAvailableMonths.find(
      (m) => m.key === bookmakerSelectedMonth
    );
    const scopeLabel =
      bookmakerPeriodMode === 'all'
        ? 'Histórico consolidado'
        : bookmakerPeriodMode === 'annual'
        ? `Año ${bookmakerSelectedYear}`
        : activeMonthObj?.label || bookmakerSelectedMonth;

    return {
      operatorsCount,
      positiveOperators,
      negativeOperators,
      resolvedCount,
      totalBetsCount: bookmakerPeriodBets.length,
      netProfit,
      totalStake,
      yieldPct,
      avgStake,
      betsPerWeek,
      monthlyStakeAvg,
      scopeLabel,
      topAlpha: periodBookmakerInsights.topProfitBookmaker,
    };
  }, [
    periodBookmakerInsights,
    bookmakerPeriodBets,
    bookmakerPeriodMode,
    bookmakerSelectedYear,
    bookmakerSelectedMonth,
    bookmakerAvailableMonths,
  ]);

  // Meses con actividad ordenados descendentemente para el calendario mensual
  const activeCalendarMonths = useMemo(() => {
    const map = new Map<string, { key: string; label: string; profit: number; betsCount: number }>();
    for (const [ymd, data] of Object.entries(heatmapMap) as [
      string,
      DailyHeatmapDay,
    ][]) {
      const mKey = ymd.slice(0, 7);
      const [yStr, mStr] = mKey.split('-');
      const mIdx = parseInt(mStr, 10) - 1;
      const cur = map.get(mKey) || {
        key: mKey,
        label: `${MONTH_NAMES_ES[mIdx] || mStr} ${yStr}`,
        profit: 0,
        betsCount: 0,
      };
      cur.profit = Number((cur.profit + data.profit).toFixed(2));
      cur.betsCount += data.betsCount;
      map.set(mKey, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [heatmapMap]);

  const currentSystemMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [calendarMonth, setCalendarMonth] = useState<string>(() => currentSystemMonth);

  // Si el mes seleccionado no tiene actividad al cambiar filtro/datos, apuntar al mes más reciente con actividad
  useEffect(() => {
    if (activeCalendarMonths.length === 0) {
      setCalendarMonth(currentSystemMonth);
      return;
    }
    const hasCurrent = activeCalendarMonths.some((m) => m.key === calendarMonth);
    if (!hasCurrent) {
      const systemHasData = activeCalendarMonths.some(
        (m) => m.key === currentSystemMonth
      );
      setCalendarMonth(
        systemHasData ? currentSystemMonth : activeCalendarMonths[0].key
      );
    }
    setSelectedDay(null);
    setSelectedEmptyDate(null);
  }, [activeCalendarMonths, currentSystemMonth]);

  const navigateCalendarMonth = (delta: number) => {
    const [y, m] = calendarMonth.split('-').map((n) => parseInt(n, 10));
    const d = new Date(y, m - 1 + delta, 1, 12, 0, 0);
    const nextKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setCalendarMonth(nextKey);
    setSelectedDay(null);
    setSelectedEmptyDate(null);
  };

  // Construir matriz mensual estándar (columnas Lun -> Dom, filas semanas)
  const monthlyCalendarData = useMemo(() => {
    const [yearNum, monthNum] = calendarMonth.split('-').map((n) => parseInt(n, 10));
    const firstDay = new Date(yearNum, monthNum - 1, 1, 12, 0, 0);
    const lastDay = new Date(yearNum, monthNum, 0, 12, 0, 0);

    // Offset desde Lunes (0=Lun .. 6=Dom)
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - startOffset);

    const endDayOfWeek = (lastDay.getDay() + 6) % 7;
    const endOffset = 6 - endDayOfWeek;
    const gridEnd = new Date(lastDay);
    gridEnd.setDate(gridEnd.getDate() + endOffset);

    const cells: Array<{
      ymd: string;
      dayNum: number;
      inCurrentMonth: boolean;
      isToday: boolean;
      data?: DailyHeatmapDay;
    }> = [];

    const now = new Date();
    const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let monthProfit = 0;
    let monthBets = 0;
    let positiveDays = 0;
    let negativeDays = 0;
    let maxAbsProfit = 0;

    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const d = cursor.getDate();
      const ymd = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const inCurrentMonth = y === yearNum && m === monthNum;
      const data = inCurrentMonth ? heatmapMap[ymd] : undefined;

      if (inCurrentMonth && data) {
        monthProfit += data.profit;
        monthBets += data.betsCount;
        if (data.profit > 0.005) positiveDays++;
        else if (data.profit < -0.005) negativeDays++;
        if (Math.abs(data.profit) > maxAbsProfit) {
          maxAbsProfit = Math.abs(data.profit);
        }
      }

      cells.push({
        ymd,
        dayNum: d,
        inCurrentMonth,
        isToday: ymd === todayYMD,
        data,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const monthTitle = `${MONTH_NAMES_ES[monthNum - 1] || monthNum} ${yearNum}`;

    return {
      monthTitle,
      cells,
      monthProfit: Number(monthProfit.toFixed(2)),
      monthBets,
      positiveDays,
      negativeDays,
      maxAbsProfit: maxAbsProfit || 1,
    };
  }, [calendarMonth, heatmapMap]);

  // Mejores/peores días de la semana para resumen rápido
  const weekdaySummary = useMemo(() => {
    const active = weekdayStats.filter((d) => d.betsCount > 0);
    if (active.length === 0) return null;
    const best = [...active].sort((a, b) => b.profit - a.profit)[0];
    const worst = [...active].sort((a, b) => a.profit - b.profit)[0];
    const busiest = [...active].sort((a, b) => b.betsCount - a.betsCount)[0];
    return { best, worst, busiest };
  }, [weekdayStats]);

  // Distribución de capital (Donut: Top 6 por stake + Otros operadores)
  const capitalDistributionData = useMemo(() => {
    const DONUT_PALETTE = [
      '#10b981', // emerald-500
      '#0ea5e9', // sky-500
      '#f59e0b', // amber-500
      '#f43f5e', // rose-500
      '#6366f1', // indigo-500
      '#14b8a6', // teal-500
    ];

    const withStake = [...periodBookmakerInsights.items]
      .filter((b) => b.stake > 0)
      .sort((a, b) => b.stake - a.stake);

    const totalStake = withStake.reduce((acc, i) => acc + i.stake, 0);
    if (totalStake <= 0) return [];

    const topItems = withStake.slice(0, 6);
    const otherItems = withStake.slice(6);

    const slices = topItems.map((item, idx) => ({
      name: item.bookmaker,
      value: Number(item.stake.toFixed(2)),
      sharePct: Number(((item.stake / totalStake) * 100).toFixed(1)),
      betsCount: item.betsCount,
      profit: item.profit,
      roi: item.roi,
      color: DONUT_PALETTE[idx % DONUT_PALETTE.length],
      isOther: false,
    }));

    if (otherItems.length > 0) {
      const otherStake = otherItems.reduce((acc, i) => acc + i.stake, 0);
      const otherProfit = otherItems.reduce((acc, i) => acc + i.profit, 0);
      const otherBets = otherItems.reduce((acc, i) => acc + i.betsCount, 0);
      const otherRoi =
        otherStake > 0 ? Number(((otherProfit / otherStake) * 100).toFixed(2)) : 0;

      slices.push({
        name: `Otros operadores (${otherItems.length})`,
        value: Number(otherStake.toFixed(2)),
        sharePct: Number(((otherStake / totalStake) * 100).toFixed(1)),
        betsCount: otherBets,
        profit: Number(otherProfit.toFixed(2)),
        roi: otherRoi,
        color: '#64748b', // slate-500
        isOther: true,
      });
    }

    return slices;
  }, [periodBookmakerInsights.items]);

  // Ranking horizontal de rentabilidad neta (P&L €)
  const resolvedBookmakersByProfit = useMemo(() => {
    return [...periodBookmakerInsights.items]
      .filter((b) => b.resolvedCount > 0)
      .sort((a, b) => b.profit - a.profit);
  }, [periodBookmakerInsights.items]);

  const bookmakersByProfit = useMemo(() => {
    return rankingScope === 'top8'
      ? resolvedBookmakersByProfit.slice(0, 8)
      : resolvedBookmakersByProfit;
  }, [resolvedBookmakersByProfit, rankingScope]);

  // Tarjetas detalladas por casa de apuestas (ritmo semanal, ventaja s/ cuota y etiqueta de perfil)
  const bookmakerCardItems = useMemo(() => {
    // Calcular span de semanas global del periodo para ritmo coherente
    const allYmds = bookmakerPeriodBets
      .map(extractStableYMD)
      .filter((v): v is string => Boolean(v))
      .sort((a, b) => a.localeCompare(b));

    let periodWeeks = 1;
    if (allYmds.length > 0) {
      const firstDate = parseLocalDateFromYMD(allYmds[0]);
      const lastDate = parseLocalDateFromYMD(allYmds[allYmds.length - 1]);
      const diffDays = Math.max(
        1,
        Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      );
      periodWeeks = Math.max(1, diffDays / 7);
    }

    let positiveRank = 0;

    return periodBookmakerInsights.items.map((item) => {
      let rankBadge = 'Operador Activo';
      let rankClass = 'text-zinc-300 bg-zinc-800/80 border-zinc-700/80';

      if (item.resolvedCount > 0 && item.profit > 0.005) {
        positiveRank += 1;
        if (positiveRank === 1) {
          rankBadge = '#1 Profit';
          rankClass = 'text-amber-300 bg-amber-500/15 border-amber-500/40';
        } else if (positiveRank === 2) {
          rankBadge = '#2 Profit';
          rankClass = 'text-zinc-200 bg-zinc-700/60 border-zinc-600/80';
        } else if (positiveRank === 3) {
          rankBadge = '#3 Profit';
          rankClass = 'text-orange-300 bg-orange-500/15 border-orange-500/40';
        } else if (item.roi >= 20) {
          rankBadge = 'Alto Yield';
          rankClass = 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40';
        } else if (item.betsCount >= 20) {
          rankBadge = 'Core Volume';
          rankClass = 'text-sky-300 bg-sky-500/15 border-sky-500/40';
        }
      } else if (item.resolvedCount > 0 && item.profit < -0.005) {
        rankBadge = 'En Negativo';
        rankClass = 'text-rose-300 bg-rose-500/15 border-rose-500/40';
      }

      const betsPerWeek = Number((item.betsCount / periodWeeks).toFixed(1));
      const impliedWinRate = item.avgOdds > 0 ? (1 / item.avgOdds) * 100 : 0;
      const edgePct =
        item.resolvedCount > 0 && item.avgOdds > 0
          ? Number((item.winRate - impliedWinRate).toFixed(1))
          : 0;

      return {
        ...item,
        rankBadge,
        rankClass,
        betsPerWeek,
        edgePct,
        brand: getBookmakerBrandVisual(item.bookmaker),
      };
    });
  }, [periodBookmakerInsights.items, bookmakerPeriodBets]);

  return (
    <section
      aria-label="Estadísticas Avanzadas"
      className="pt-6 mt-2 border-t border-zinc-800/80 space-y-6"
    >
      {/* Cabecera de la Sección con Selector Interactivo de Estrategia */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Estadísticas Avanzadas
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 flex flex-wrap items-center gap-1.5">
            <span>{resolvedBets.length} apuestas resueltas</span>
            <span aria-hidden="true">·</span>
            <span>{riskMetrics.activeDays} días con actividad</span>
            <span aria-hidden="true">·</span>
            <span>{bookmakerInsights.items.length} casas analizadas</span>
          </p>
        </div>

        {/* Selector interactivo Global / Valor / Matched */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto shrink-0">
          {[
            { id: 'all', label: 'Global', icon: Layers, activeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
            { id: 'value', label: 'Valor (+EV)', icon: Zap, activeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' },
            { id: 'matched', label: 'Matched Betting', icon: Gift, activeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = strategyFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStrategyFilter(tab.id as StrategyFilter)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border whitespace-nowrap shrink-0 ${
                  isActive
                    ? tab.activeClass
                    : 'text-zinc-400 border-transparent hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Estado Vacío Global si el filtro no tiene apuestas resueltas */}
      {resolvedBets.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-10 text-center space-y-3">
          <BarChart3 className="w-10 h-10 text-zinc-500 mx-auto opacity-60" />
          <div>
            <h3 className="text-sm font-bold text-zinc-200">
              No hay apuestas resueltas para este filtro
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Registra y resuelve apuestas (ganadas o perdidas) en{' '}
              {strategyFilter === 'matched'
                ? 'Matched Betting'
                : strategyFilter === 'value'
                ? 'Apuestas de Valor'
                : 'tu historial'}{' '}
              para desbloquear el calendario de beneficios, cuotas, rachas y casas de apuestas.
            </p>
          </div>
          {strategyFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setStrategyFilter('all')}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
            >
              Ver todas (Global)
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* ================================================================
              BLOQUE 1: CARTERA Y RENTABILIDAD POR CASA DE APUESTAS
             ================================================================ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-5">
            {/* Barra superior: Selector Histórico / Anual / Mensual + Resumen de alcance */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  {[
                    { id: 'all', label: 'Histórico', icon: Landmark },
                    { id: 'annual', label: 'Anual', icon: Calendar },
                    { id: 'monthly', label: 'Mensual', icon: CalendarDays },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = bookmakerPeriodMode === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() =>
                          setBookmakerPeriodMode(tab.id as 'all' | 'annual' | 'monthly')
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border whitespace-nowrap shrink-0 ${
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

                {/* Selector de Año cuando está en modo Anual */}
                {bookmakerPeriodMode === 'annual' && bookmakerAvailableYears.length > 0 && (
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                    {bookmakerAvailableYears.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setBookmakerSelectedYear(yr)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition whitespace-nowrap shrink-0 ${
                          bookmakerSelectedYear === yr
                            ? 'bg-zinc-800 text-white border border-zinc-700'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selector de Mes cuando está en modo Mensual */}
                {bookmakerPeriodMode === 'monthly' && bookmakerAvailableMonths.length > 0 && (
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        const idx = bookmakerAvailableMonths.findIndex(
                          (m) => m.key === bookmakerSelectedMonth
                        );
                        if (idx >= 0 && idx < bookmakerAvailableMonths.length - 1) {
                          setBookmakerSelectedMonth(bookmakerAvailableMonths[idx + 1].key);
                        }
                      }}
                      disabled={
                        bookmakerAvailableMonths.findIndex(
                          (m) => m.key === bookmakerSelectedMonth
                        ) >=
                        bookmakerAvailableMonths.length - 1
                      }
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition"
                      title="Mes anterior con actividad"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-semibold text-zinc-200 min-w-[108px] text-center whitespace-nowrap">
                      {bookmakerAvailableMonths.find((m) => m.key === bookmakerSelectedMonth)
                        ?.label || bookmakerSelectedMonth}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const idx = bookmakerAvailableMonths.findIndex(
                          (m) => m.key === bookmakerSelectedMonth
                        );
                        if (idx > 0) {
                          setBookmakerSelectedMonth(bookmakerAvailableMonths[idx - 1].key);
                        }
                      }}
                      disabled={
                        bookmakerAvailableMonths.findIndex(
                          (m) => m.key === bookmakerSelectedMonth
                        ) <= 0
                      }
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition"
                      title="Mes siguiente con actividad"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="text-xs text-zinc-400 font-medium flex items-center gap-2">
                <span className="text-zinc-200 font-semibold">
                  {bookmakerPeriodSummary.scopeLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-emerald-400">
                  {bookmakerPeriodSummary.totalBetsCount} apuestas
                </span>
              </div>
            </div>

            {/* Fila de 4 tarjetas KPI (estilo adaptado a la web) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* KPI 1: Operadores en Cartera */}
              <div className="relative overflow-hidden bg-zinc-950/75 border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between gap-2.5">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-sky-500/80 via-cyan-400/50 to-transparent" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400">
                    Operadores en Cartera
                  </span>
                  <span className="text-[11px] font-semibold font-mono tabular-nums text-sky-400 shrink-0">
                    {bookmakerPeriodSummary.operatorsCount} activos
                  </span>
                </div>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-white">
                  {bookmakerPeriodSummary.operatorsCount}
                </div>
                <div className="text-xs flex items-center gap-2 font-mono tabular-nums">
                  <span className="text-emerald-400 font-semibold">
                    {bookmakerPeriodSummary.positiveOperators} en verde
                  </span>
                  <span className="text-zinc-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-rose-400 font-semibold">
                    {bookmakerPeriodSummary.negativeOperators} en rojo
                  </span>
                </div>
              </div>

              {/* KPI 2: Beneficio Neto Consolidado */}
              <div className="relative overflow-hidden bg-zinc-950/75 border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between gap-2.5">
                <div
                  className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${
                    bookmakerPeriodSummary.netProfit >= 0
                      ? 'from-emerald-500/80 via-emerald-400/40'
                      : 'from-rose-500/80 via-rose-400/40'
                  } to-transparent`}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400">
                    Beneficio Neto
                  </span>
                  <span
                    className={`text-[11px] font-bold font-mono tabular-nums shrink-0 ${
                      bookmakerPeriodSummary.yieldPct >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {bookmakerPeriodSummary.yieldPct >= 0 ? '+' : ''}
                    {bookmakerPeriodSummary.yieldPct}% Yield
                  </span>
                </div>
                <div
                  className={`text-2xl font-extrabold font-mono tabular-nums ${
                    bookmakerPeriodSummary.netProfit >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {formatEuro(bookmakerPeriodSummary.netProfit)}
                </div>
                <div className="text-xs text-zinc-400">
                  Sobre{' '}
                  <span className="font-mono tabular-nums text-zinc-300 font-semibold">
                    {bookmakerPeriodSummary.resolvedCount}
                  </span>{' '}
                  apuestas resueltas
                </div>
              </div>

              {/* KPI 3: Capital Total Invertido */}
              <div className="relative overflow-hidden bg-zinc-950/75 border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between gap-2.5">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-500/80 via-indigo-400/40 to-transparent" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400">
                    Capital Invertido
                  </span>
                  <span className="text-[11px] font-semibold font-mono tabular-nums text-cyan-400 shrink-0">
                    {bookmakerPeriodSummary.betsPerWeek} ap/sem
                  </span>
                </div>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-white">
                  {formatEuro(bookmakerPeriodSummary.totalStake, false)}
                </div>
                <div className="text-xs text-zinc-400 font-mono tabular-nums">
                  Stake medio: {bookmakerPeriodSummary.avgStake.toFixed(2)} € ·{' '}
                  {bookmakerPeriodSummary.monthlyStakeAvg} €/mes
                </div>
              </div>

              {/* KPI 4: Operador Alfa (#1 Profit) */}
              <div className="relative overflow-hidden bg-zinc-950/75 border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between gap-2.5">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500/80 via-amber-400/40 to-transparent" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400">
                    Operador Alfa (#1)
                  </span>
                  <span className="text-[11px] font-semibold text-amber-400 shrink-0">
                    Líder
                  </span>
                </div>
                {bookmakerPeriodSummary.topAlpha ? (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                      <span className="text-xl font-extrabold text-amber-300 truncate">
                        {bookmakerPeriodSummary.topAlpha.bookmaker}
                      </span>
                    </div>
                    <div className="text-xs font-mono tabular-nums flex items-center gap-1.5">
                      <span
                        className={`font-bold ${
                          bookmakerPeriodSummary.topAlpha.profit >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {formatEuro(bookmakerPeriodSummary.topAlpha.profit)}
                      </span>
                      <span className="text-zinc-400">
                        (Yield: {bookmakerPeriodSummary.topAlpha.roi >= 0 ? '+' : ''}
                        {bookmakerPeriodSummary.topAlpha.roi}%)
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-base font-bold text-zinc-500">Sin datos</div>
                    <div className="text-xs text-zinc-500">Sin apuestas resueltas</div>
                  </>
                )}
              </div>
            </div>

            {/* Dos gráficos principales: Donut de Distribución de Capital + Barras de Ranking P&L */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Gráfico Izquierdo: Distribución de Capital (% Bankroll) */}
              <div className="lg:col-span-5 bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-5 flex flex-col justify-between gap-4">
                <div className="pb-3 border-b border-zinc-800/80">
                  <h3 className="text-sm font-bold text-white">
                    Distribución de Capital (% Bankroll)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Concentración de volumen apostado por operador
                  </p>
                </div>

                {capitalDistributionData.length === 0 ? (
                  <div className="flex-1 min-h-[240px] flex items-center justify-center text-xs text-zinc-500">
                    Sin capital resuelto en este periodo
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Donut Chart */}
                    <div className="w-full sm:w-[54%] h-[235px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={capitalDistributionData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="54%"
                            outerRadius="88%"
                            paddingAngle={2}
                            stroke="#09090b"
                            strokeWidth={2}
                            onMouseEnter={(_, idx) => setActiveDonutIndex(idx)}
                            onMouseLeave={() => setActiveDonutIndex(null)}
                          >
                            {capitalDistributionData.map((slice, idx) => (
                              <Cell
                                key={`slice-${slice.name}`}
                                fill={slice.color}
                                fillOpacity={
                                  activeDonutIndex === null || activeDonutIndex === idx
                                    ? 0.92
                                    : 0.4
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<BookmakerDonutTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Leyenda limpia a la derecha */}
                    <div className="w-full sm:w-[46%] space-y-2">
                      {capitalDistributionData.map((slice, idx) => (
                        <div
                          key={slice.name}
                          onMouseEnter={() => setActiveDonutIndex(idx)}
                          onMouseLeave={() => setActiveDonutIndex(null)}
                          className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg transition-colors cursor-default ${
                            activeDonutIndex === idx ? 'bg-zinc-800/70' : 'hover:bg-zinc-900/80'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: slice.color }}
                            />
                            <span className="text-xs font-medium text-zinc-200 truncate">
                              {slice.name}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono tabular-nums text-zinc-400 shrink-0">
                            {slice.sharePct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Gráfico Derecho: Ranking de Rentabilidad Neta (P&L €) */}
              <div className="lg:col-span-7 bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-5 flex flex-col justify-between gap-4">
                <div className="pb-3 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Ranking de Rentabilidad Neta (P&L €)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Ganancias y pérdidas consolidadas por operador
                    </p>
                  </div>
                  {resolvedBookmakersByProfit.length > 8 && (
                    <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setRankingScope('top8')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition whitespace-nowrap ${
                          rankingScope === 'top8'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Top 8
                      </button>
                      <button
                        type="button"
                        onClick={() => setRankingScope('all')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition whitespace-nowrap ${
                          rankingScope === 'all'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Todos ({resolvedBookmakersByProfit.length})
                      </button>
                    </div>
                  )}
                </div>

                {bookmakersByProfit.length === 0 ? (
                  <div className="flex-1 min-h-[240px] flex items-center justify-center text-xs text-zinc-500">
                    Sin operaciones resueltas en este periodo
                  </div>
                ) : (
                  <div
                    className="w-full"
                    style={{ height: Math.max(240, bookmakersByProfit.length * 32) }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={bookmakersByProfit}
                        layout="vertical"
                        margin={{ top: 4, right: 20, left: 6, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#27272a"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          stroke="#71717a"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `${val >= 0 && val !== 0 ? '+' : ''}${val} €`}
                        />
                        <YAxis
                          type="category"
                          dataKey="bookmaker"
                          stroke="#e4e4e7"
                          fontSize={12}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                          width={126}
                        />
                        <ReferenceLine x={0} stroke="#52525b" />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                          content={<BookmakerAnalyticsTooltip />}
                        />
                        <Bar dataKey="profit" radius={[0, 6, 6, 0]} maxBarSize={22}>
                          {bookmakersByProfit.map((entry, idx) => (
                            <Cell
                              key={`bm-pnl-${idx}`}
                              fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'}
                              fillOpacity={0.9}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Cuadrícula de Tarjetas por Casa de Apuestas con acceso a Ficha Técnica */}
            {bookmakerCardItems.length > 0 && (
              <div className="pt-2 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Fichas por Operador ({bookmakerCardItems.length})
                  </h4>
                  <span className="text-[11px] text-zinc-500">
                    Pulsa en Ficha Técnica para auditar evolución e historial
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {bookmakerCardItems.map((item) => {
                    const isProfitPos = item.profit >= 0;
                    const hasResolved = item.resolvedCount > 0;

                    return (
                      <div
                        key={item.bookmaker}
                        className="relative overflow-hidden bg-zinc-950/75 border border-zinc-800/90 hover:border-zinc-700/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 transition-colors"
                      >
                        <div
                          className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${item.brand.topAccentClass} to-transparent`}
                        />

                        {/* Cabecera: Icono + Nombre + Etiqueta + Balance Neto */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center font-extrabold text-xs tracking-tight shrink-0 ${item.brand.badgeClass}`}
                            >
                              {item.brand.short}
                            </div>
                            <div className="min-w-0">
                              <div className="text-base font-extrabold text-white truncate">
                                {item.bookmaker}
                              </div>
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${item.rankClass}`}
                              >
                                {item.rankBadge}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                              Balance Neto
                            </span>
                            <div
                              className={`px-2.5 py-1 rounded-lg border font-mono tabular-nums text-sm font-extrabold ${
                                isProfitPos
                                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400'
                                  : 'bg-rose-500/10 border-rose-500/35 text-rose-400'
                              }`}
                            >
                              {formatEuro(item.profit)}
                            </div>
                          </div>
                        </div>

                        {/* Barra de Acierto (Ganadas vs Perdidas + Pendientes) */}
                        <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-zinc-200">
                              Acierto ({hasResolved ? `${item.winRate}%` : '—'})
                            </span>
                            <div className="flex items-center gap-1.5 font-mono tabular-nums text-[11px]">
                              <span className="inline-flex items-center gap-0.5 text-emerald-400 font-bold">
                                {item.wonBets}
                                <Check className="w-3 h-3" />
                              </span>
                              <span className="text-zinc-600">/</span>
                              <span className="inline-flex items-center gap-0.5 text-rose-400 font-bold">
                                {item.lostBets}
                                <X className="w-3 h-3" />
                              </span>
                              {item.pendingBets > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-amber-400 ml-0.5">
                                  ({item.pendingBets}
                                  <Clock className="w-2.5 h-2.5" />)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-rose-500/30 overflow-hidden">
                            {hasResolved && (
                              <div
                                className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(0, item.winRate))}%` }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Cuadrícula 2x2 de Métricas Clave */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/70">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block">
                              Volumen Total
                            </span>
                            <div className="text-sm font-extrabold font-mono tabular-nums text-white mt-0.5">
                              {formatEuro(item.stake, false)}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/70">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block">
                              Stake Medio
                            </span>
                            <div className="text-sm font-extrabold font-mono tabular-nums text-white mt-0.5">
                              {hasResolved ? formatEuro(item.avgStake, false) : '—'}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/70">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block">
                              Cuota Media
                            </span>
                            <div className="text-sm font-extrabold font-mono tabular-nums text-amber-400 mt-0.5">
                              {item.avgOdds > 0 ? `@${item.avgOdds.toFixed(2)}` : '—'}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/70">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block">
                              Yield Operativo
                            </span>
                            <div
                              className={`text-sm font-extrabold font-mono tabular-nums mt-0.5 ${
                                item.stake <= 0
                                  ? 'text-zinc-400'
                                  : item.roi >= 0
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {item.stake > 0
                                ? `${item.roi >= 0 ? '+' : ''}${item.roi}%`
                                : '—'}
                            </div>
                          </div>
                        </div>

                        {/* Pie de tarjeta: Ritmo + Ventaja + Botón Ficha Técnica */}
                        <div className="pt-1 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-zinc-400 font-mono tabular-nums truncate">
                            Ritmo: <span className="text-zinc-200 font-semibold">{item.betsPerWeek} ap/sem</span>
                            <span className="mx-1.5 text-zinc-600" aria-hidden="true">·</span>
                            Edge:{' '}
                            <span
                              className={`font-semibold ${
                                item.edgePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {hasResolved && item.avgOdds > 0
                                ? `${item.edgePct >= 0 ? '+' : ''}${item.edgePct}%`
                                : '—'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedAuditBookmaker(item.bookmaker)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <span>Ficha Técnica</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ================================================================
              BLOQUE 2: RENDIMIENTO POR RANGOS DE CUOTA (MÁS VISUAL)
             ================================================================ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span>Rendimiento por Rangos de Cuota</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Beneficio neto (barras), tendencia de ROI % (línea azul) y comparativa visual de acierto real frente al implícito
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-zinc-400 shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  Beneficio (€)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-sky-400 rounded-full" />
                  ROI (%)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
              {/* Gráfico Combinado: Barras de Beneficio + Línea de ROI */}
              <div className="xl:col-span-6 h-[270px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={oddsStats}
                    margin={{ top: 12, right: 6, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis
                      dataKey="range"
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${val}€`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#38bdf8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <ReferenceLine yAxisId="left" y={0} stroke="#52525b" />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      content={<OddsComposedTooltip />}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="profit"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={46}
                    >
                      {oddsStats.map((entry, idx) => (
                        <Cell
                          key={`odds-${idx}`}
                          fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'}
                          fillOpacity={entry.betsCount === 0 ? 0.2 : 0.85}
                        />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="roi"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#09090b', stroke: '#38bdf8', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#38bdf8', stroke: '#09090b', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Barras visuales de Ventaja (Acierto Real vs Implícito) por tramo */}
              <div className="xl:col-span-6 space-y-3">
                {oddsStats.map((row) => {
                  const hasBets = row.betsCount > 0;
                  const beatsImplied = row.edgePercent >= 0;
                  return (
                    <div
                      key={row.range}
                      className={`p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 space-y-2 ${
                        !hasBets ? 'opacity-45' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">
                            {row.range}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
                            {row.betsCount} ap ({row.wonBets}G/{row.lostBets}P) · Stake {row.stake.toFixed(0)}€
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono tabular-nums">
                          <span
                            className={`font-semibold ${
                              !hasBets
                                ? 'text-zinc-500'
                                : row.roi >= 0
                                ? 'text-sky-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {hasBets ? `ROI ${row.roi >= 0 ? '+' : ''}${row.roi}%` : '—'}
                          </span>
                          <span
                            className={`font-bold min-w-[74px] text-right ${
                              !hasBets
                                ? 'text-zinc-500'
                                : row.profit >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {hasBets ? formatEuro(row.profit) : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Barra visual comparativa: Acierto Real vs Marcador Implícito */}
                      <div className="space-y-1">
                        <div className="relative h-2.5 w-full rounded-full bg-zinc-800/80 overflow-hidden">
                          {hasBets && (
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                beatsImplied ? 'bg-emerald-500/85' : 'bg-rose-500/80'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(2, row.winRate))}%` }}
                            />
                          )}
                          {hasBets && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]"
                              style={{
                                left: `${Math.min(99, Math.max(1, row.impliedWinRate))}%`,
                              }}
                              title={`Acierto implícito esperado: ${row.impliedWinRate}%`}
                            />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-400">
                          <span>
                            Acierto real:{' '}
                            <strong className="text-zinc-200">
                              {hasBets ? `${row.winRate}%` : '—'}
                            </strong>
                          </span>
                          <span>
                            Implícito (1/cuota):{' '}
                            <strong className="text-zinc-300">
                              {hasBets ? `${row.impliedWinRate}%` : '—'}
                            </strong>
                            {hasBets && (
                              <span
                                className={`ml-1.5 font-semibold ${
                                  beatsImplied ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                ({row.edgePercent >= 0 ? '+' : ''}
                                {row.edgePercent}% ventaja)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ================================================================
              BLOQUE 3: CALENDARIO MENSUAL VISUAL CON BENEFICIO EN CADA DÍA
             ================================================================ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                  <span>Calendario Mensual de Beneficios</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span>{monthlyCalendarData.monthBets} apuestas en el mes</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-medium">
                    {monthlyCalendarData.positiveDays} días en verde
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-rose-400 font-medium">
                    {monthlyCalendarData.negativeDays} en rojo
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-mono tabular-nums font-bold ${
                      monthlyCalendarData.monthProfit >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    Balance mes: {formatEuro(monthlyCalendarData.monthProfit)}
                  </span>
                </p>
              </div>

              {/* Controles de Mes: Navegación Anterior / Mes / Siguiente + Acceso Rápido */}
              <div className="flex flex-wrap items-center gap-2">
                {activeCalendarMonths.length > 1 && (
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 overflow-x-auto max-w-full">
                    {activeCalendarMonths.slice(0, 4).map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => {
                          setCalendarMonth(m.key);
                          setSelectedDay(null);
                          setSelectedEmptyDate(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap shrink-0 ${
                          calendarMonth === m.key
                            ? 'bg-zinc-800 text-white border border-zinc-700'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigateCalendarMonth(-1)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                    title="Mes anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2.5 text-xs font-bold text-white min-w-[120px] text-center whitespace-nowrap">
                    {monthlyCalendarData.monthTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateCalendarMonth(1)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                    title="Mes siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cuadrícula de Calendario Estándar: Lunes -> Domingo de Izquierda a Derecha */}
            <div className="space-y-1.5">
              {/* Cabecera de días de la semana */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEKDAY_HEADERS.map((dayName) => (
                  <div
                    key={dayName}
                    className="text-center text-[11px] font-semibold text-zinc-400 py-1.5 bg-zinc-950/60 rounded-lg border border-zinc-800/60"
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Celdas de los días del mes */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {monthlyCalendarData.cells.map((cell) => {
                  if (!cell.inCurrentMonth) {
                    return (
                      <div
                        key={cell.ymd}
                        className="min-h-[68px] sm:min-h-[82px] rounded-xl border border-zinc-800/30 bg-zinc-950/25 p-2 opacity-25 select-none"
                      >
                        <span className="text-[11px] font-mono text-zinc-500">
                          {cell.dayNum}
                        </span>
                      </div>
                    );
                  }

                  const data = cell.data;
                  const hasData = !!data;
                  const isPos = hasData && data.profit > 0.005;
                  const isNeg = hasData && data.profit < -0.005;
                  const intensity = hasData
                    ? Math.min(1, Math.abs(data.profit) / monthlyCalendarData.maxAbsProfit)
                    : 0;

                  let cardBg =
                    'bg-zinc-950/65 border-zinc-800/75 hover:border-zinc-700';
                  if (isPos) {
                    cardBg =
                      intensity >= 0.6
                        ? 'bg-emerald-500/20 border-emerald-500/50 hover:border-emerald-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400/70';
                  } else if (isNeg) {
                    cardBg =
                      intensity >= 0.6
                        ? 'bg-rose-500/20 border-rose-500/50 hover:border-rose-400'
                        : 'bg-rose-500/10 border-rose-500/30 hover:border-rose-400/70';
                  } else if (hasData) {
                    cardBg = 'bg-zinc-800/50 border-zinc-700/70 hover:border-zinc-500';
                  }

                  const isSelected =
                    (selectedDay && selectedDay.date === cell.ymd) ||
                    selectedEmptyDate === cell.ymd;

                  return (
                    <button
                      key={cell.ymd}
                      type="button"
                      onMouseEnter={() => {
                        if (data) {
                          setSelectedDay(data);
                          setSelectedEmptyDate(null);
                        } else {
                          setSelectedDay(null);
                          setSelectedEmptyDate(cell.ymd);
                        }
                      }}
                      onClick={() => {
                        if (data) {
                          setSelectedDay(data);
                          setSelectedEmptyDate(null);
                        } else {
                          setSelectedDay(null);
                          setSelectedEmptyDate(cell.ymd);
                        }
                      }}
                      className={`min-h-[68px] sm:min-h-[82px] rounded-xl border p-1.5 sm:p-2.5 flex flex-col justify-between text-left transition-all cursor-pointer ${cardBg} ${
                        isSelected ? 'ring-1 ring-white/80' : ''
                      }`}
                    >
                      {/* Fila superior: Número de día y nº apuestas */}
                      <div className="flex items-center justify-between w-full gap-1">
                        <span
                          className={`text-xs font-mono tabular-nums font-bold ${
                            cell.isToday
                              ? 'text-sky-400 underline underline-offset-2'
                              : hasData
                              ? 'text-zinc-200'
                              : 'text-zinc-500'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        {hasData && (
                          <span className="text-[10px] font-mono tabular-nums text-zinc-400 hidden sm:inline">
                            {data.betsCount} ap.
                          </span>
                        )}
                      </div>

                      {/* Valor principal: +30€ en verde o -5€ en rojo */}
                      <div className="w-full text-center sm:text-right mt-1">
                        {hasData ? (
                          <span
                            className={`text-xs sm:text-base font-extrabold font-mono tabular-nums tracking-tight block truncate ${
                              isPos
                                ? 'text-emerald-400'
                                : isNeg
                                ? 'text-rose-400'
                                : 'text-zinc-300'
                            }`}
                          >
                            {formatCompactDayEuro(data.profit)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-zinc-700 block">
                            —
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pie del Calendario: Inspector del día seleccionado */}
            <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="min-h-[20px] flex flex-wrap items-center gap-2 text-zinc-400">
                {selectedDay ? (
                  <>
                    <span className="font-semibold text-zinc-200">
                      {formatYMDHuman(selectedDay.date)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-mono tabular-nums font-bold ${
                        selectedDay.profit > 0
                          ? 'text-emerald-400'
                          : selectedDay.profit < 0
                          ? 'text-rose-400'
                          : 'text-zinc-300'
                      }`}
                    >
                      {formatEuro(selectedDay.profit)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {selectedDay.betsCount}{' '}
                      {selectedDay.betsCount === 1 ? 'apuesta' : 'apuestas'} ({selectedDay.wonBets}G / {selectedDay.lostBets}P)
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Stake {selectedDay.stake.toFixed(2)}€
                    </span>
                  </>
                ) : selectedEmptyDate ? (
                  <>
                    <span className="font-semibold text-zinc-300">
                      {formatYMDHuman(selectedEmptyDate)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Sin apuestas resueltas este día</span>
                  </>
                ) : (
                  <span>
                    Cada casilla muestra el beneficio o pérdida neta de ese día. Selecciona uno para ver el detalle.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-zinc-400 shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-400" />
                  Ganancia
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/40 border border-rose-400" />
                  Pérdida
                </span>
              </div>
            </div>
          </div>

          {/* ================================================================
              BLOQUE 4: RENDIMIENTO POR DÍA DE LA SEMANA
             ================================================================ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Rendimiento por Día de la Semana</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Distribución del beneficio neto y ROI de lunes a domingo
                </p>
              </div>
              {weekdaySummary && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                  <span>
                    Mejor día:{' '}
                    <strong className="text-zinc-200">{weekdaySummary.best.dayLabel}</strong>{' '}
                    <span className="font-mono tabular-nums text-emerald-400 font-bold">
                      ({formatEuro(weekdaySummary.best.profit)})
                    </span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Mayor volumen:{' '}
                    <strong className="text-zinc-200">{weekdaySummary.busiest.dayLabel}</strong>{' '}
                    <span className="font-mono tabular-nums">
                      ({weekdaySummary.busiest.betsCount} ap.)
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weekdayStats}
                  margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
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
                  <ReferenceLine y={0} stroke="#52525b" />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    content={<GenericProfitTooltip labelField="dayLabel" />}
                  />
                  <Bar dataKey="profit" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {weekdayStats.map((entry, idx) => (
                      <Cell
                        key={`wd-${idx}`}
                        fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'}
                        fillOpacity={entry.betsCount === 0 ? 0.2 : 0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ================================================================
              BLOQUE 5: RESUMEN DE RIESGO, CONSISTENCIA Y RACHAS
             ================================================================ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Resumen de Riesgo, Consistencia y Rachas</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Indicadores de solidez del bankroll, rachas extremas y relación beneficio/pérdida
                </p>
              </div>
              <div className="text-xs text-zinc-400 font-mono tabular-nums">
                Bruto:{' '}
                <span className="text-emerald-400 font-semibold">
                  +{riskMetrics.grossWins.toFixed(2)}€
                </span>{' '}
                <span aria-hidden="true">/</span>{' '}
                <span className="text-rose-400 font-semibold">
                  -{riskMetrics.grossLosses.toFixed(2)}€
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-zinc-800/80 rounded-xl bg-zinc-950/60 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/80">
              <div className="p-3.5">
                <span className="text-[11px] text-zinc-400 font-medium block">
                  Profit Factor
                </span>
                <div
                  className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                    riskMetrics.profitFactor === null || riskMetrics.profitFactor >= 1.2
                      ? 'text-emerald-400'
                      : riskMetrics.profitFactor >= 1
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {riskMetrics.profitFactor === null
                    ? '∞'
                    : riskMetrics.profitFactor.toFixed(2)}
                </div>
                <span className="text-[11px] text-zinc-500">
                  {riskMetrics.profitFactor === null
                    ? 'Sin pérdidas registradas'
                    : riskMetrics.profitFactor >= 1
                    ? `${riskMetrics.profitFactor.toFixed(2)}€ ganados / 1€ perdido`
                    : 'Pérdidas superan ganancias'}
                </span>
              </div>

              <div className="p-3.5">
                <span className="text-[11px] text-zinc-400 font-medium block">
                  Drawdown Máximo
                </span>
                <div className="text-lg font-bold font-mono tabular-nums text-rose-400 mt-0.5">
                  {riskMetrics.maxDrawdown < 0
                    ? `${riskMetrics.maxDrawdown.toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} €`
                    : '0,00 €'}
                </div>
                <span className="text-[11px] text-zinc-500">
                  {riskMetrics.maxDrawdownDate
                    ? `Caída el ${formatYMDHuman(riskMetrics.maxDrawdownDate)}`
                    : 'Sin retroceso desde máximos'}
                </span>
              </div>

              <div className="p-3.5">
                <span className="text-[11px] text-zinc-400 font-medium block">
                  Mejor / Peor Racha
                </span>
                <div className="text-lg font-bold font-mono tabular-nums mt-0.5 flex items-center gap-1.5">
                  <span className="text-emerald-400">{riskMetrics.bestWinStreak}W</span>
                  <span className="text-zinc-600 text-sm">/</span>
                  <span className="text-rose-400">{riskMetrics.worstLossStreak}L</span>
                </div>
                <span className="text-[11px] text-zinc-500">
                  Aciertos vs. fallos seguidos
                </span>
              </div>

              <div className="p-3.5">
                <span className="text-[11px] text-zinc-400 font-medium block">
                  Consistencia Diaria
                </span>
                <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                  {riskMetrics.positiveDaysRate}%
                </div>
                <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
                  {riskMetrics.positiveDays} días + · {riskMetrics.negativeDays} días -
                </span>
              </div>

              <div className="p-3.5">
                <span className="text-[11px] text-zinc-400 font-medium block">
                  Media por Día Activo
                </span>
                <div
                  className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                    riskMetrics.avgDailyProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatEuro(riskMetrics.avgDailyProfit)}
                </div>
                <span className="text-[11px] text-zinc-500">
                  En {riskMetrics.activeDays} jornadas
                </span>
              </div>

              <div className="p-3.5">
                <span className="text-[11px] text-zinc-400 font-medium block">
                  Extremos (1 Apuesta)
                </span>
                <div className="text-sm font-bold font-mono tabular-nums mt-1 space-y-0.5">
                  <div className="text-emerald-400">
                    +{riskMetrics.maxSingleWin.toFixed(2)} €
                  </div>
                  <div className="text-rose-400">
                    {riskMetrics.maxSingleLoss.toFixed(2)} €
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ficha Técnica y Auditoría por Casa de Apuestas */}
      {selectedAuditBookmaker && (
        <BookmakerAuditModal
          bookmaker={selectedAuditBookmaker}
          allStrategyBets={filteredBets}
          initialPeriodMode={bookmakerPeriodMode}
          initialYear={bookmakerSelectedYear}
          initialMonth={bookmakerSelectedMonth}
          onClose={() => setSelectedAuditBookmaker(null)}
        />
      )}
    </section>
  );
};

/**
 * Tooltip para gráfico compuesto de Cuotas (Beneficio + ROI + Acierto)
 */
const OddsComposedTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: any }>;
}) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-950/95 border border-zinc-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md min-w-[210px]">
      <div className="font-bold text-white border-b border-zinc-800 pb-1 flex items-center justify-between gap-3">
        <span>Cuota {d.range}</span>
        <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
          {d.betsCount} ap.
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-400">Beneficio neto:</span>
        <span
          className={`font-mono tabular-nums font-bold ${
            d.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {formatEuro(d.profit)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-400">ROI:</span>
        <span
          className={`font-mono tabular-nums font-semibold ${
            d.roi >= 0 ? 'text-sky-400' : 'text-rose-400'
          }`}
        >
          {d.roi >= 0 ? '+' : ''}
          {d.roi}%
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 text-[11px] text-zinc-400">
        <span>Acierto real / implícito:</span>
        <span className="font-mono tabular-nums text-zinc-200">
          {d.winRate}% / {d.impliedWinRate}%
        </span>
      </div>
    </div>
  );
};

/**
 * Tooltip para el Donut de Distribución de Capital (% Bankroll)
 */
const BookmakerDonutTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: any }>;
}) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-950/95 border border-zinc-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md min-w-[200px]">
      <div className="font-bold text-white border-b border-zinc-800 pb-1 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: d.color }}
          />
          {d.name}
        </span>
        <span className="text-[11px] text-cyan-400 font-mono tabular-nums font-semibold">
          {d.sharePct}%
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-400">Capital apostado:</span>
        <span className="font-mono tabular-nums font-bold text-white">
          {formatEuro(d.value, false)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-400">Beneficio neto:</span>
        <span
          className={`font-mono tabular-nums font-bold ${
            d.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {formatEuro(d.profit)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 text-[11px] text-zinc-400">
        <span>Apuestas / Yield:</span>
        <span className="font-mono tabular-nums text-zinc-200">
          {d.betsCount} ap. · {d.roi >= 0 ? '+' : ''}
          {d.roi}%
        </span>
      </div>
    </div>
  );
};

/**
 * Tooltip para gráfico de Ranking de Rentabilidad Neta por Casa
 */
const BookmakerAnalyticsTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: any }>;
}) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-950/95 border border-zinc-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md min-w-[205px]">
      <div className="font-bold text-white border-b border-zinc-800 pb-1 flex items-center justify-between gap-3">
        <span>{d.bookmaker}</span>
        <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
          {d.volumeSharePercent}% uso
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-400">Beneficio neto:</span>
        <span
          className={`font-mono tabular-nums font-bold ${
            d.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {formatEuro(d.profit)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-400">Apuestas:</span>
        <span className="font-mono tabular-nums text-sky-400 font-semibold">
          {d.betsCount} ({d.wonBets}G / {d.lostBets}P)
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 text-[11px] text-zinc-400">
        <span>Yield / Win Rate:</span>
        <span className="font-mono tabular-nums text-zinc-200">
          {d.roi >= 0 ? '+' : ''}
          {d.roi}% · {d.winRate}%
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 text-[11px] text-zinc-500">
        <span>Stake / Cuota media:</span>
        <span className="font-mono tabular-nums text-zinc-300">
          {d.stake.toFixed(0)}€ · @{d.avgOdds}
        </span>
      </div>
    </div>
  );
};

/**
 * Tooltip genérico reutilizable para el gráfico de Día de la Semana
 */
const GenericProfitTooltip = ({
  active,
  payload,
  labelField = 'range',
}: {
  active?: boolean;
  payload?: Array<{ payload: any }>;
  labelField?: string;
}) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const title = d[labelField] ?? d.range;

  return (
    <div className="bg-zinc-950/95 border border-zinc-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md min-w-[190px]">
      <div className="font-bold text-white border-b border-zinc-800 pb-1 flex items-center justify-between gap-3">
        <span>{title}</span>
        <span className="text-[11px] text-zinc-400 font-normal font-mono tabular-nums">
          {d.betsCount} ap.
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-400">Beneficio neto:</span>
        <span
          className={`font-mono tabular-nums font-bold ${
            d.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {formatEuro(d.profit)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-400">ROI:</span>
        <span
          className={`font-mono tabular-nums font-semibold ${
            d.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {d.roi >= 0 ? '+' : ''}
          {d.roi}%
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 text-[11px] text-zinc-400">
        <span>Win Rate:</span>
        <span className="font-mono tabular-nums text-zinc-200">{d.winRate}%</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-[11px] text-zinc-500">
        <span>Stake:</span>
        <span className="font-mono tabular-nums text-zinc-300">
          {Number(d.stake || 0).toFixed(2)} €
        </span>
      </div>
    </div>
  );
};
