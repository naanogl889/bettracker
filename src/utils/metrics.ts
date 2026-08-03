import {
  Bet,
  BetStatus,
  BookmakerStat,
  CumulativeProfitPoint,
  DashboardMetrics,
  SportStat,
} from '../types/bets';

/**
 * Calcula el beneficio real en base al estado de la apuesta:
 * - ganada: Stake × (Cuota - 1)
 * - perdida: -Stake
 * - pendiente o nula: 0
 */
export function calculateProfitForBet(
  stake: number,
  odds: number,
  status: BetStatus
): number {
  if (status === 'won') {
    return Number((stake * (odds - 1)).toFixed(2));
  }
  if (status === 'lost') {
    return Number((-stake).toFixed(2));
  }
  return 0;
}

/**
 * Calcula las métricas generales del Dashboard
 */
export function calculateDashboardMetrics(bets: Bet[]): DashboardMetrics {
  let totalProfit = 0;
  let totalStake = 0;
  let wonBets = 0;
  let lostBets = 0;
  let voidBets = 0;
  let pendingBets = 0;
  let totalOddsSum = 0;
  let maxWin = 0;
  let maxLoss = 0;

  const resolvedBetsList = bets.filter(
    (b) => b.status === 'won' || b.status === 'lost'
  );

  for (const bet of bets) {
    if (bet.status === 'won') {
      wonBets++;
      totalStake += bet.stake;
      totalProfit += bet.profit;
      totalOddsSum += bet.odds;
      if (bet.profit > maxWin) maxWin = bet.profit;
    } else if (bet.status === 'lost') {
      lostBets++;
      totalStake += bet.stake;
      totalProfit += bet.profit;
      totalOddsSum += bet.odds;
      if (bet.profit < maxLoss) maxLoss = bet.profit;
    } else if (bet.status === 'void') {
      voidBets++;
    } else {
      pendingBets++;
    }
  }

  const resolvedBets = wonBets + lostBets;
  const winRate =
    resolvedBets > 0 ? Number(((wonBets / resolvedBets) * 100).toFixed(1)) : 0;
  const roi =
    totalStake > 0 ? Number(((totalProfit / totalStake) * 100).toFixed(2)) : 0;
  const avgOdds =
    resolvedBets > 0 ? Number((totalOddsSum / resolvedBets).toFixed(2)) : 0;

  return {
    totalProfit: Number(totalProfit.toFixed(2)),
    roi,
    totalBets: bets.length,
    resolvedBets,
    wonBets,
    lostBets,
    voidBets,
    pendingBets,
    winRate,
    totalStake: Number(totalStake.toFixed(2)),
    avgOdds,
    maxWin: Number(maxWin.toFixed(2)),
    maxLoss: Number(maxLoss.toFixed(2)),
  };
}

/**
 * Calcula la evolución temporal del beneficio acumulado para la gráfica
 */
export function calculateCumulativeProfit(
  bets: Bet[]
): CumulativeProfitPoint[] {
  // Ordenar apuestas resueltas por fecha de creación o de evento
  const resolved = bets
    .filter((b) => b.status === 'won' || b.status === 'lost')
    .sort((a, b) => {
      const dateA = a.event_date || a.created_at;
      const dateB = b.event_date || b.created_at;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

  if (resolved.length === 0) {
    return [];
  }

  // Agrupar beneficio por día
  const dailyMap = new Map<string, { profit: number; count: number }>();

  for (const bet of resolved) {
    const rawDate = bet.event_date || bet.created_at;
    const dateStr = rawDate.split('T')[0];
    const current = dailyMap.get(dateStr) || { profit: 0, count: 0 };
    dailyMap.set(dateStr, {
      profit: current.profit + bet.profit,
      count: current.count + 1,
    });
  }

  const sortedDates = Array.from(dailyMap.keys()).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  let cumulative = 0;
  const points: CumulativeProfitPoint[] = [];

  for (const dateStr of sortedDates) {
    const dayData = dailyMap.get(dateStr)!;
    cumulative += dayData.profit;

    // Formatear día (ej: 15 jul)
    const [year, month, day] = dateStr.split('-');
    const months = [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ];
    const monthName = months[parseInt(month, 10) - 1] || month;
    const formattedDate = `${parseInt(day, 10)} ${monthName}`;

    points.push({
      date: dateStr,
      formattedDate,
      dailyProfit: Number(dayData.profit.toFixed(2)),
      cumulativeProfit: Number(cumulative.toFixed(2)),
      betCount: dayData.count,
    });
  }

  return points;
}

/**
 * Estadísticas por Casa de Apuestas
 */
export function calculateBookmakerStats(bets: Bet[]): BookmakerStat[] {
  const map = new Map<
    string,
    { betsCount: number; stake: number; profit: number; won: number; resolved: number }
  >();

  for (const bet of bets) {
    const name = bet.bookmaker || 'Desconocida';
    const current = map.get(name) || {
      betsCount: 0,
      stake: 0,
      profit: 0,
      won: 0,
      resolved: 0,
    };

    current.betsCount++;
    if (bet.status === 'won' || bet.status === 'lost') {
      current.stake += bet.stake;
      current.profit += bet.profit;
      current.resolved++;
      if (bet.status === 'won') {
        current.won++;
      }
    }
    map.set(name, current);
  }

  const result: BookmakerStat[] = [];
  for (const [bookmaker, stats] of map.entries()) {
    const roi =
      stats.stake > 0 ? Number(((stats.profit / stats.stake) * 100).toFixed(2)) : 0;
    const winRate =
      stats.resolved > 0
        ? Number(((stats.won / stats.resolved) * 100).toFixed(1))
        : 0;

    result.push({
      bookmaker,
      betsCount: stats.betsCount,
      stake: Number(stats.stake.toFixed(2)),
      profit: Number(stats.profit.toFixed(2)),
      roi,
      winRate,
    });
  }

  return result.sort((a, b) => b.profit - a.profit);
}

/**
 * Estadísticas por Deporte
 */
export function calculateSportStats(bets: Bet[]): SportStat[] {
  const map = new Map<
    string,
    { betsCount: number; stake: number; profit: number; won: number; resolved: number }
  >();

  for (const bet of bets) {
    const sport = bet.sport || 'General / Otros';
    const current = map.get(sport) || {
      betsCount: 0,
      stake: 0,
      profit: 0,
      won: 0,
      resolved: 0,
    };

    current.betsCount++;
    if (bet.status === 'won' || bet.status === 'lost') {
      current.stake += bet.stake;
      current.profit += bet.profit;
      current.resolved++;
      if (bet.status === 'won') {
        current.won++;
      }
    }
    map.set(sport, current);
  }

  const result: SportStat[] = [];
  for (const [sport, stats] of map.entries()) {
    const roi =
      stats.stake > 0 ? Number(((stats.profit / stats.stake) * 100).toFixed(2)) : 0;
    const winRate =
      stats.resolved > 0
        ? Number(((stats.won / stats.resolved) * 100).toFixed(1))
        : 0;

    result.push({
      sport,
      betsCount: stats.betsCount,
      stake: Number(stats.stake.toFixed(2)),
      profit: Number(stats.profit.toFixed(2)),
      roi,
      winRate,
    });
  }

  return result.sort((a, b) => b.profit - a.profit);
}

/**
 * Calcula comparativas (últimos 30 días vs anteriores, racha, etc.)
 */
export function calculateComparativeMetrics(bets: Bet[]) {
  const now = new Date().getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const resolved = bets.filter(
    (b) => b.status === 'won' || b.status === 'lost'
  );

  let profitLast30 = 0;
  let stakeLast30 = 0;
  let profitPrev30 = 0;
  let stakePrev30 = 0;

  for (const b of resolved) {
    const time = new Date(b.event_date || b.created_at).getTime();
    if (now - time <= thirtyDaysMs) {
      profitLast30 += b.profit;
      stakeLast30 += b.stake;
    } else if (now - time <= thirtyDaysMs * 2) {
      profitPrev30 += b.profit;
      stakePrev30 += b.stake;
    }
  }

  const roiLast30 =
    stakeLast30 > 0 ? (profitLast30 / stakeLast30) * 100 : 0;
  const roiPrev30 =
    stakePrev30 > 0 ? (profitPrev30 / stakePrev30) * 100 : 0;
  const roiDiff = Number((roiLast30 - roiPrev30).toFixed(1));

  // Racha actual (W o L seguidas)
  const sorted = [...resolved].sort(
    (a, b) =>
      new Date(b.event_date || b.created_at).getTime() -
      new Date(a.event_date || a.created_at).getTime()
  );

  let currentStreak = 0;
  let streakType: 'W' | 'L' | 'N' = 'N';
  for (const b of sorted) {
    if (streakType === 'N') {
      streakType = b.status === 'won' ? 'W' : 'L';
      currentStreak = 1;
    } else if (
      (streakType === 'W' && b.status === 'won') ||
      (streakType === 'L' && b.status === 'lost')
    ) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    profitLast30: Number(profitLast30.toFixed(2)),
    roiDiff,
    currentStreak,
    streakType,
    avgStake:
      resolved.length > 0
        ? Number(
            (
              resolved.reduce((acc, b) => acc + b.stake, 0) /
              resolved.length
            ).toFixed(2)
          )
        : 0,
  };
}

/**
 * Desglosa las estadísticas entre Apuestas de Valor y Matched Betting (Bonos/Surebets)
 */
export function calculateStrategyStats(bets: Bet[]) {
  const valueBets = bets.filter((b) => !b.category || b.category === 'value');
  const matchedBets = bets.filter((b) => b.category === 'matched');

  const valueMetrics = calculateDashboardMetrics(valueBets);
  const matchedMetrics = calculateDashboardMetrics(matchedBets);
  const totalMetrics = calculateDashboardMetrics(bets);

  return {
    valueBets: valueMetrics,
    matchedBets: matchedMetrics,
    total: totalMetrics,
    matchedCount: matchedBets.length,
    valueCount: valueBets.length,
  };
}

