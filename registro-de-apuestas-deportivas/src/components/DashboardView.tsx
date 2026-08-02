import React, { useState } from 'react';
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
  Plus,
  Clock,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Bet } from '../types/bets';
import {
  calculateDashboardMetrics,
  calculateCumulativeProfit,
  calculateBookmakerStats,
  calculateSportStats,
  calculateComparativeMetrics,
} from '../utils/metrics';

interface DashboardViewProps {
  bets: Bet[];
  onOpenNewBet: () => void;
  onNavigateToTab: (tab: 'pending' | 'history') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  bets,
  onOpenNewBet,
  onNavigateToTab,
}) => {
  const [chartPeriod, setChartPeriod] = useState<'all' | 'last10' | 'last30'>('all');

  const metrics = calculateDashboardMetrics(bets);
  const cumulativeData = calculateCumulativeProfit(bets);
  const comp = calculateComparativeMetrics(bets);

  const filteredChartData = React.useMemo(() => {
    if (chartPeriod === 'last10') {
      return cumulativeData.slice(-10);
    }
    if (chartPeriod === 'last30') {
      return cumulativeData.slice(-30);
    }
    return cumulativeData;
  }, [cumulativeData, chartPeriod]);

  const bookmakerStats = calculateBookmakerStats(bets);
  const sportStats = calculateSportStats(bets);

  const recentBets = React.useMemo(() => {
    return [...bets]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5);
  }, [bets]);

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

      {/* Banner de Bienvenida y Atajos (<10s) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900/60 border border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Resumen en Tiempo Real
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
            Dashboard de Rendimiento
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Analiza tu rentabilidad, ROI y evolución de ganancias al instante.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {metrics.pendingBets > 0 && (
            <button
              onClick={() => onNavigateToTab('pending')}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Resolver ({metrics.pendingBets})</span>
            </button>
          )}
          <button
            onClick={onOpenNewBet}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold shadow-md shadow-emerald-500/15 flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva apuesta (10s)</span>
          </button>
        </div>
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

      {/* Grid Secundario: Gráfica de Evolución + Historial Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfica Evolución Beneficio Acumulado (8 columnas) */}
        <div className="lg:col-span-8 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Evolución del Beneficio Acumulado</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Progreso del rendimiento financiero en apuestas resueltas
              </p>
            </div>

            {/* Selector de periodo */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
              {[
                { id: 'all', label: 'Todo' },
                { id: 'last30', label: '30 días' },
                { id: 'last10', label: '10 días' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setChartPeriod(p.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    chartPeriod === p.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Área del Gráfico Recharts */}
          <div className="h-[260px] sm:h-[300px] w-full">
            {filteredChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="profitGradient"
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
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cumulativeProfit"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#profitGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center text-zinc-500">
                <BarChart2 className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm font-medium">
                  Aún no hay apuestas resueltas para graficar.
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  En cuanto resuelvas una apuesta pendiente, verás su progresión aquí.
                </p>
              </div>
            )}
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
                          <p className="text-[11px] text-zinc-400 truncate">
                            {bet.bookmaker} • Stake {bet.stake}€ • @
                            <span className="font-mono">{bet.odds}</span>
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

      {/* Grid Terciario: Casas de Apuestas y Deportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rendimiento por Casa de Apuestas */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Rendimiento por Casa de Apuestas</span>
            <span className="text-xs text-zinc-400 font-normal">
              Top rentabilidad
            </span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
                  <th className="pb-2">Casa</th>
                  <th className="pb-2 text-right">Apuestas</th>
                  <th className="pb-2 text-right">Stake</th>
                  <th className="pb-2 text-right">ROI %</th>
                  <th className="pb-2 text-right">Beneficio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {bookmakerStats.slice(0, 5).map((stat) => {
                  const pos = stat.profit >= 0;
                  return (
                    <tr
                      key={stat.bookmaker}
                      className="hover:bg-zinc-800/40 transition"
                    >
                      <td className="py-2.5 font-semibold text-white">
                        {stat.bookmaker}
                      </td>
                      <td className="py-2.5 text-right text-zinc-300">
                        {stat.betsCount}
                      </td>
                      <td className="py-2.5 text-right font-mono text-zinc-400">
                        {stat.stake}€
                      </td>
                      <td
                        className={`py-2.5 text-right font-semibold ${
                          stat.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {stat.roi >= 0 ? '+' : ''}
                        {stat.roi}%
                      </td>
                      <td
                        className={`py-2.5 text-right font-mono font-bold ${
                          pos ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {pos ? '+' : ''}
                        {stat.profit}€
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rendimiento por Deporte */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Rendimiento por Deporte</span>
            <span className="text-xs text-zinc-400 font-normal">
              Especialización
            </span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
                  <th className="pb-2">Deporte</th>
                  <th className="pb-2 text-right">Apuestas</th>
                  <th className="pb-2 text-right">Stake</th>
                  <th className="pb-2 text-right">Win Rate</th>
                  <th className="pb-2 text-right">Beneficio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {sportStats.slice(0, 5).map((stat) => {
                  const pos = stat.profit >= 0;
                  return (
                    <tr
                      key={stat.sport}
                      className="hover:bg-zinc-800/40 transition"
                    >
                      <td className="py-2.5 font-semibold text-white">
                        {stat.sport}
                      </td>
                      <td className="py-2.5 text-right text-zinc-300">
                        {stat.betsCount}
                      </td>
                      <td className="py-2.5 text-right font-mono text-zinc-400">
                        {stat.stake}€
                      </td>
                      <td className="py-2.5 text-right font-semibold text-sky-400">
                        {stat.winRate}%
                      </td>
                      <td
                        className={`py-2.5 text-right font-mono font-bold ${
                          pos ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {pos ? '+' : ''}
                        {stat.profit}€
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Tooltip personalizado del gráfico para modo oscuro
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPos = data.cumulativeProfit >= 0;
    const isDailyPos = data.dailyProfit >= 0;

    return (
      <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-xl shadow-xl text-xs space-y-1 backdrop-blur-md">
        <p className="font-bold text-zinc-300 border-b border-zinc-800 pb-1">
          {data.formattedDate}
        </p>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-400">Día:</span>
          <span
            className={`font-mono font-bold ${
              isDailyPos ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isDailyPos ? '+' : ''}
            {data.dailyProfit}€
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-400">Acumulado:</span>
          <span
            className={`font-mono font-bold ${
              isPos ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPos ? '+' : ''}
            {data.cumulativeProfit}€
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
          {data.betCount} apuesta{data.betCount !== 1 ? 's' : ''} resuelta{data.betCount !== 1 ? 's' : ''}
        </div>
      </div>
    );
  }
  return null;
};
