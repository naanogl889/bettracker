import { Bet } from '../types/bets';
import {
  calculateAdvancedBookmakerInsights,
  calculateRiskAndStreakMetrics,
  calculateWeekdayStats,
} from './metrics';

export type InsightCategory = 'operators' | 'weekly' | 'monthly' | 'records';

export type InsightTone =
  | 'default'
  | 'bold'
  | 'emerald'
  | 'rose'
  | 'sky'
  | 'amber'
  | 'cyan';

export interface InsightSegment {
  text: string;
  tone?: InsightTone;
}

export interface AccountInsightItem {
  id: string;
  emoji: string;
  category: InsightCategory;
  categoryLabel: string;
  title: string;
  segments: InsightSegment[];
}

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function extractYMD(bet: Bet): string | null {
  const raw = bet.event_date || bet.created_at;
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDMY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

function fmtSignedEuro(val: number): string {
  const fixed = Math.abs(val).toFixed(2);
  if (val > 0) return `+${fixed} €`;
  if (val < 0) return `-${fixed} €`;
  return `0.00 €`;
}

export function generateAccountInsights(bets: Bet[]): AccountInsightItem[] {
  const resolved = bets.filter((b) => b.status === 'won' || b.status === 'lost');
  if (resolved.length === 0) {
    return [];
  }

  const insights: AccountInsightItem[] = [];

  const bookmakerInsights = calculateAdvancedBookmakerInsights(bets);
  const weekdayStats = calculateWeekdayStats(bets);
  const riskMetrics = calculateRiskAndStreakMetrics(bets);

  const totalWon = resolved.filter((b) => b.status === 'won').length;
  const totalLost = resolved.filter((b) => b.status === 'lost').length;
  const globalWinRate =
    resolved.length > 0 ? ((totalWon / resolved.length) * 100).toFixed(1) : '0.0';

  // 1. Operador Más Rentable
  if (bookmakerInsights.topProfitBookmaker) {
    const top = bookmakerInsights.topProfitBookmaker;
    insights.push({
      id: 'top-profit-operator',
      emoji: '👑',
      category: 'operators',
      categoryLabel: 'Operadores',
      title: 'Operador Más Rentable',
      segments: [
        { text: `${top.bookmaker}`, tone: 'bold' },
        { text: ' con ' },
        {
          text: `${fmtSignedEuro(top.profit)}`,
          tone: top.profit >= 0 ? 'emerald' : 'rose',
        },
        { text: ' netos.' },
      ],
    });
  }

  // 2. Tasa de Acierto Global
  insights.push({
    id: 'global-win-rate',
    emoji: '⚡',
    category: 'records',
    categoryLabel: 'Récords y Forma',
    title: 'Tasa de Acierto Global',
    segments: [
      { text: `${globalWinRate}%`, tone: 'sky' },
      { text: ` (${totalWon} Ganadas / ${totalLost} Perdidas).` },
    ],
  });

  // 3. Día Más Efectivo de la Semana (Mayor % de acierto)
  const activeWeekdays = weekdayStats.filter((d) => d.betsCount > 0);
  if (activeWeekdays.length > 0) {
    const mostEffectiveDay = [...activeWeekdays].sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.betsCount - a.betsCount;
    })[0];

    insights.push({
      id: 'most-effective-weekday',
      emoji: '🎯',
      category: 'weekly',
      categoryLabel: 'Semanal',
      title: 'Día Más Efectivo de la Semana',
      segments: [
        { text: `${mostEffectiveDay.dayLabel}`, tone: 'bold' },
        { text: ' con un ' },
        { text: `${mostEffectiveDay.winRate.toFixed(1)}%`, tone: 'emerald' },
        { text: ' de aciertos.' },
      ],
    });

    // 4. Día Más Rentable de la Semana
    const mostProfitableDay = [...activeWeekdays].sort(
      (a, b) => b.profit - a.profit
    )[0];

    insights.push({
      id: 'most-profitable-weekday',
      emoji: '🎯',
      category: 'weekly',
      categoryLabel: 'Semanal',
      title: 'Día Más Rentable de la Semana',
      segments: [
        { text: `${mostProfitableDay.dayLabel}`, tone: 'bold' },
        { text: ' con ' },
        {
          text: `${fmtSignedEuro(mostProfitableDay.profit)}`,
          tone: mostProfitableDay.profit >= 0 ? 'emerald' : 'rose',
        },
        { text: ' de beneficio.' },
      ],
    });
  }

  // 5 y 6. Comparativa Fin de semana vs Laborables (Acierto y Rentabilidad)
  const weekendDays = weekdayStats.filter((d) => d.dayIndex >= 5);
  const workDays = weekdayStats.filter((d) => d.dayIndex < 5);

  const weekendResolved = weekendDays.reduce((acc, d) => acc + d.betsCount, 0);
  const weekendWon = weekendDays.reduce((acc, d) => acc + d.wonBets, 0);
  const weekendProfit = weekendDays.reduce((acc, d) => acc + d.profit, 0);
  const weekendWinRate =
    weekendResolved > 0 ? ((weekendWon / weekendResolved) * 100).toFixed(1) : '0.0';

  const workResolved = workDays.reduce((acc, d) => acc + d.betsCount, 0);
  const workWon = workDays.reduce((acc, d) => acc + d.wonBets, 0);
  const workProfit = workDays.reduce((acc, d) => acc + d.profit, 0);
  const workWinRate =
    workResolved > 0 ? ((workWon / workResolved) * 100).toFixed(1) : '0.0';

  insights.push({
    id: 'weekend-vs-weekday-winrate',
    emoji: '📊',
    category: 'weekly',
    categoryLabel: 'Semanal',
    title: 'Comparativa de Acierto',
    segments: [
      { text: 'Fin de semana: ' },
      { text: `${weekendWinRate}%`, tone: 'sky' },
      { text: ' vs Laborables: ' },
      { text: `${workWinRate}%`, tone: 'cyan' },
      { text: '.' },
    ],
  });

  insights.push({
    id: 'weekend-vs-weekday-profit',
    emoji: '📊',
    category: 'weekly',
    categoryLabel: 'Semanal',
    title: 'Comparativa de Rentabilidad',
    segments: [
      { text: 'Fin de semana: ' },
      {
        text: `${fmtSignedEuro(weekendProfit)}`,
        tone: weekendProfit >= 0 ? 'emerald' : 'rose',
      },
      { text: ' vs Laborables: ' },
      {
        text: `${fmtSignedEuro(workProfit)}`,
        tone: workProfit >= 0 ? 'emerald' : 'rose',
      },
      { text: '.' },
    ],
  });

  // Agrupación Mensual para métricas 7, 8, 12 y 19
  const monthlyMap = new Map<
    string,
    { key: string; label: string; won: number; resolved: number; profit: number; stake: number }
  >();

  for (const bet of resolved) {
    const ymd = extractYMD(bet);
    if (!ymd) continue;
    const mKey = ymd.slice(0, 7);
    const [yStr, mStr] = mKey.split('-');
    const mIdx = parseInt(mStr, 10) - 1;
    const cur = monthlyMap.get(mKey) || {
      key: mKey,
      label: `${MONTH_NAMES_ES[mIdx] || mStr} ${yStr}`,
      won: 0,
      resolved: 0,
      profit: 0,
      stake: 0,
    };
    cur.resolved += 1;
    if (bet.status === 'won') cur.won += 1;
    cur.profit += bet.profit || 0;
    cur.stake += bet.stake || 0;
    monthlyMap.set(mKey, cur);
  }

  const monthsArr = Array.from(monthlyMap.values());

  // 7. Mes con Mejor Win Rate
  if (monthsArr.length > 0) {
    const bestWinRateMonth = [...monthsArr].sort((a, b) => {
      const wrA = a.resolved > 0 ? a.won / a.resolved : 0;
      const wrB = b.resolved > 0 ? b.won / b.resolved : 0;
      if (wrB !== wrA) return wrB - wrA;
      return b.profit - a.profit;
    })[0];
    const bestMonthWR = (
      (bestWinRateMonth.won / bestWinRateMonth.resolved) *
      100
    ).toFixed(1);

    insights.push({
      id: 'best-winrate-month',
      emoji: '🎯',
      category: 'monthly',
      categoryLabel: 'Mensual',
      title: 'Mes con Mejor Win Rate',
      segments: [
        { text: `${bestWinRateMonth.label}`, tone: 'bold' },
        { text: ' con un ' },
        { text: `${bestMonthWR}%`, tone: 'emerald' },
        { text: ' de aciertos y ' },
        {
          text: `${fmtSignedEuro(bestWinRateMonth.profit)}`,
          tone: bestWinRateMonth.profit >= 0 ? 'emerald' : 'rose',
        },
        { text: ' de beneficio.' },
      ],
    });

    // 8. Rendimiento Medio Mensual
    const totalProfitAllMonths = monthsArr.reduce((acc, m) => acc + m.profit, 0);
    const avgMonthlyProfit = totalProfitAllMonths / monthsArr.length;

    insights.push({
      id: 'avg-monthly-profit',
      emoji: '📆',
      category: 'monthly',
      categoryLabel: 'Mensual',
      title: 'Rendimiento Medio Mensual',
      segments: [
        {
          text: `${avgMonthlyProfit >= 0 ? '+' : '-'}${Math.abs(avgMonthlyProfit).toFixed(2)} €/mes`,
          tone: avgMonthlyProfit >= 0 ? 'emerald' : 'rose',
        },
        { text: ` (media en ${monthsArr.length} ${monthsArr.length === 1 ? 'mes' : 'meses'}).` },
      ],
    });
  }

  // Agrupación Diaria para récords 9 y 17
  const dailyMap = new Map<string, { ymd: string; won: number; profit: number }>();
  for (const bet of resolved) {
    const ymd = extractYMD(bet);
    if (!ymd) continue;
    const cur = dailyMap.get(ymd) || { ymd, won: 0, profit: 0 };
    if (bet.status === 'won') cur.won += 1;
    cur.profit += bet.profit || 0;
    dailyMap.set(ymd, cur);
  }
  const daysArr = Array.from(dailyMap.values());

  // 9. Récord de Aciertos en un Día
  if (daysArr.length > 0) {
    const bestWinsDay = [...daysArr].sort((a, b) => {
      if (b.won !== a.won) return b.won - a.won;
      return b.profit - a.profit;
    })[0];

    if (bestWinsDay.won > 0) {
      insights.push({
        id: 'record-wins-day',
        emoji: '🎯',
        category: 'records',
        categoryLabel: 'Récords y Forma',
        title: 'Récord de Aciertos en un Día',
        segments: [
          { text: `${bestWinsDay.won} ${bestWinsDay.won === 1 ? 'apuesta ganada' : 'apuestas ganadas'}`, tone: 'emerald' },
          { text: ' en la jornada del ' },
          { text: `${formatDMY(bestWinsDay.ymd)}`, tone: 'bold' },
          { text: '.' },
        ],
      });
    }
  }

  // 10. Día de Mayor Actividad (de la semana)
  if (activeWeekdays.length > 0) {
    const busiestDay = [...activeWeekdays].sort(
      (a, b) => b.betsCount - a.betsCount
    )[0];

    insights.push({
      id: 'busiest-weekday',
      emoji: '📅',
      category: 'weekly',
      categoryLabel: 'Semanal',
      title: 'Día de Mayor Actividad',
      segments: [
        { text: `${busiestDay.dayLabel}`, tone: 'bold' },
        { text: ' concentrando ' },
        { text: `${busiestDay.betsCount} ${busiestDay.betsCount === 1 ? 'apuesta' : 'apuestas'}`, tone: 'sky' },
        { text: '.' },
      ],
    });
  }

  // 11. Bookmaker de Cuotas Más Agresivas (Mayor cuota media)
  const operatorsWithOdds = bookmakerInsights.items.filter((i) => i.avgOdds > 0);
  if (operatorsWithOdds.length > 0) {
    const highestOddsOp = [...operatorsWithOdds].sort(
      (a, b) => b.avgOdds - a.avgOdds
    )[0];

    insights.push({
      id: 'most-aggressive-odds-bookmaker',
      emoji: '🚀',
      category: 'operators',
      categoryLabel: 'Operadores',
      title: 'Bookmaker de Cuotas Más Agresivas',
      segments: [
        { text: `${highestOddsOp.bookmaker}`, tone: 'bold' },
        { text: ' con una media de ' },
        { text: `@${highestOddsOp.avgOdds.toFixed(2)}`, tone: 'amber' },
        { text: '.' },
      ],
    });
  }

  // 12. Mes Más Rentable Histórico
  if (monthsArr.length > 0) {
    const bestProfitMonth = [...monthsArr].sort((a, b) => b.profit - a.profit)[0];

    insights.push({
      id: 'most-profitable-month',
      emoji: '🏆',
      category: 'monthly',
      categoryLabel: 'Mensual',
      title: 'Mes Más Rentable Histórico',
      segments: [
        { text: `${bestProfitMonth.label}`, tone: 'bold' },
        { text: ' sumando ' },
        {
          text: `${fmtSignedEuro(bestProfitMonth.profit)}`,
          tone: bestProfitMonth.profit >= 0 ? 'emerald' : 'rose',
        },
        { text: '.' },
      ],
    });
  }

  // 13. Forma Reciente (Últimos 10 picks)
  const recentSorted = [...resolved].sort((a, b) => {
    const ymdA = extractYMD(a) || a.created_at;
    const ymdB = extractYMD(b) || b.created_at;
    if (ymdB !== ymdA) return ymdB.localeCompare(ymdA);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const lastPicks = recentSorted.slice(0, 10);
  const lastPicksWon = lastPicks.filter((b) => b.status === 'won').length;
  const lastPicksWR =
    lastPicks.length > 0
      ? Math.round((lastPicksWon / lastPicks.length) * 100)
      : 0;

  insights.push({
    id: 'recent-form-10',
    emoji: '🎯',
    category: 'records',
    categoryLabel: 'Récords y Forma',
    title: `Forma Reciente (Últimos ${lastPicks.length} picks)`,
    segments: [
      { text: `${lastPicksWon}/${lastPicks.length} ganados`, tone: 'bold' },
      { text: ' (' },
      {
        text: `${lastPicksWR}% Win Rate`,
        tone: lastPicksWR >= 50 ? 'emerald' : 'rose',
      },
      { text: ').' },
    ],
  });

  // 14. Operador con Mayor Win Rate
  if (bookmakerInsights.bestWinRateBookmaker) {
    const bestWR = bookmakerInsights.bestWinRateBookmaker;
    insights.push({
      id: 'best-winrate-operator',
      emoji: '🎯',
      category: 'operators',
      categoryLabel: 'Operadores',
      title: 'Operador con Mayor Win Rate',
      segments: [
        { text: `${bestWR.bookmaker}`, tone: 'bold' },
        { text: ' con un ' },
        { text: `${bestWR.winRate.toFixed(1)}%`, tone: 'emerald' },
        { text: ' de efectividad.' },
      ],
    });
  }

  // 15. Porcentaje de Días en Positivo
  insights.push({
    id: 'positive-days-percent',
    emoji: '📈',
    category: 'records',
    categoryLabel: 'Récords y Forma',
    title: 'Porcentaje de Días en Positivo',
    segments: [
      {
        text: `${riskMetrics.positiveDaysRate.toFixed(1)}%`,
        tone: riskMetrics.positiveDaysRate >= 50 ? 'emerald' : 'amber',
      },
      { text: ' de las jornadas con apuestas concluyeron en verde.' },
    ],
  });

  // 16. Mayor Capital Concentrado en (Mayor Stake)
  if (bookmakerInsights.highestStakeBookmaker) {
    const topStake = bookmakerInsights.highestStakeBookmaker;
    insights.push({
      id: 'highest-stake-operator',
      emoji: '🏦',
      category: 'operators',
      categoryLabel: 'Operadores',
      title: 'Mayor Capital Concentrado en',
      segments: [
        { text: `${topStake.bookmaker}`, tone: 'bold' },
        { text: ' con ' },
        { text: `${topStake.stake.toFixed(2)} €`, tone: 'sky' },
        { text: ' apostados.' },
      ],
    });
  }

  // 17. Récord Diario Absoluto
  if (daysArr.length > 0) {
    const bestProfitDay = [...daysArr].sort((a, b) => b.profit - a.profit)[0];

    insights.push({
      id: 'absolute-daily-record',
      emoji: '🚀',
      category: 'records',
      categoryLabel: 'Récords y Forma',
      title: 'Récord Diario Absoluto',
      segments: [
        {
          text: `${fmtSignedEuro(bestProfitDay.profit)}`,
          tone: bestProfitDay.profit >= 0 ? 'emerald' : 'rose',
        },
        { text: ' logrados el día ' },
        { text: `${formatDMY(bestProfitDay.ymd)}`, tone: 'bold' },
        { text: '.' },
      ],
    });
  }

  // 18. Beneficio Reciente (Últimos 10 picks)
  const lastPicksProfit = lastPicks.reduce((acc, b) => acc + (b.profit || 0), 0);

  insights.push({
    id: 'recent-profit-10',
    emoji: '📊',
    category: 'records',
    categoryLabel: 'Récords y Forma',
    title: `Beneficio Reciente (Últimos ${lastPicks.length} picks)`,
    segments: [
      {
        text: `${fmtSignedEuro(lastPicksProfit)}`,
        tone: lastPicksProfit >= 0 ? 'emerald' : 'rose',
      },
      { text: ' generados.' },
    ],
  });

  // 19. Mes de Mayor Volumen Invertido
  if (monthsArr.length > 0) {
    const topStakeMonth = [...monthsArr].sort((a, b) => b.stake - a.stake)[0];

    insights.push({
      id: 'highest-stake-month',
      emoji: '📈',
      category: 'monthly',
      categoryLabel: 'Mensual',
      title: 'Mes de Mayor Volumen Invertido',
      segments: [
        { text: `${topStakeMonth.label}`, tone: 'bold' },
        { text: ' con ' },
        { text: `${topStakeMonth.stake.toFixed(2)} €`, tone: 'cyan' },
        { text: ' jugados.' },
      ],
    });
  }

  return insights;
}
