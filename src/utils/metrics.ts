import {
  AdvancedBookmakerInsights,
  AdvancedBookmakerStat,
  Bet,
  BetStatus,
  BookmakerMonthlyBreakdown,
  BookmakerStat,
  CumulativeProfitPoint,
  DailyHeatmapDay,
  DashboardMetrics,
  DrawdownPoint,
  OddsRangeStat,
  RiskStreakMetrics,
  SportStat,
  StakeRangeStat,
  WeekdayStat,
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
 * Garantiza que aparezcan todas las casas que han tenido al menos una apuesta en el historial.
 */
export function calculateBookmakerStats(
  bets: Bet[],
  allHistoryBets?: Bet[]
): BookmakerStat[] {
  // Lista de referencia para canonizar nombres
  const sourceForBookmakers =
    allHistoryBets && allHistoryBets.length > 0 ? allHistoryBets : bets;

  // Mapa de nombres canónicos para evitar duplicados por minúsculas/mayúsculas
  const canonicalMap = new Map<string, string>(); // lowerName -> canonicalName

  for (const bet of sourceForBookmakers) {
    const raw = (bet.bookmaker || '').trim();
    if (!raw) continue;
    const lower = raw.toLowerCase();
    if (!canonicalMap.has(lower)) {
      canonicalMap.set(lower, raw);
    } else {
      // Si la versión actual tiene mayúscula y la anterior no, preferir la mejor capitalizada
      const existing = canonicalMap.get(lower)!;
      if (raw[0] === raw[0].toUpperCase() && existing[0] !== existing[0].toUpperCase()) {
        canonicalMap.set(lower, raw);
      }
    }
  }

  // Estructura de acumulación para todas las casas encontradas en el historial
  const map = new Map<
    string,
    {
      betsCount: number;
      stake: number;
      totalStake: number;
      profit: number;
      won: number;
      lost: number;
      pending: number;
      voidCount: number;
      resolved: number;
      monthlyMap: Map<
        string,
        {
          monthKey: string;
          monthLabel: string;
          profit: number;
          betsCount: number;
          stake: number;
          wonBets: number;
          lostBets: number;
        }
      >;
    }
  >();

  // Helper para obtener mes y etiqueta legible en español (ej: "2026-09", "Sep 26")
  const MONTH_NAMES_ES = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  const getMonthInfo = (dateStr?: string) => {
    let d: Date;
    if (dateStr) {
      d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        d = new Date();
      }
    } else {
      d = new Date();
    }
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-11
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthLabel = `${MONTH_NAMES_ES[month]} ${String(year).slice(-2)}`;
    return { monthKey, monthLabel };
  };

  // Inicializar cada casa presente en el historial con 0
  for (const canonicalName of canonicalMap.values()) {
    map.set(canonicalName, {
      betsCount: 0,
      stake: 0,
      totalStake: 0,
      profit: 0,
      won: 0,
      lost: 0,
      pending: 0,
      voidCount: 0,
      resolved: 0,
      monthlyMap: new Map(),
    });
  }

  // Si bets contiene alguna casa que no estaba en allHistoryBets, añadirla también
  for (const bet of bets) {
    const raw = (bet.bookmaker || '').trim() || 'Desconocida';
    const lower = raw.toLowerCase();
    let canonical = canonicalMap.get(lower);
    if (!canonical) {
      canonical = raw;
      canonicalMap.set(lower, raw);
    }

    let current = map.get(canonical);
    if (!current) {
      current = {
        betsCount: 0,
        stake: 0,
        totalStake: 0,
        profit: 0,
        won: 0,
        lost: 0,
        pending: 0,
        voidCount: 0,
        resolved: 0,
        monthlyMap: new Map(),
      };
      map.set(canonical, current);
    }

    const betStake = Number(bet.stake) || 0;
    const betProfit = Number(bet.profit) || 0;

    current.betsCount++;
    current.totalStake += betStake;

    const isResolved = bet.status === 'won' || bet.status === 'lost';
    if (isResolved) {
      current.stake += betStake;
      current.profit += betProfit;
      current.resolved++;
      if (bet.status === 'won') {
        current.won++;
      } else {
        current.lost++;
      }
    } else if (bet.status === 'pending') {
      current.pending++;
    } else if (bet.status === 'void') {
      current.voidCount++;
    }

    // Acumular en desglose mensual
    const betDateStr = bet.event_date || bet.created_at;
    const { monthKey, monthLabel } = getMonthInfo(betDateStr);
    let mData = current.monthlyMap.get(monthKey);
    if (!mData) {
      mData = {
        monthKey,
        monthLabel,
        profit: 0,
        betsCount: 0,
        stake: 0,
        wonBets: 0,
        lostBets: 0,
      };
      current.monthlyMap.set(monthKey, mData);
    }

    mData.betsCount++;
    if (isResolved) {
      mData.stake += betStake;
      mData.profit += betProfit;
      if (bet.status === 'won') {
        mData.wonBets++;
      } else {
        mData.lostBets++;
      }
    }
  }

  const result: BookmakerStat[] = [];
  for (const [bookmaker, stats] of map.entries()) {
    const roi =
      stats.stake > 0
        ? Number(((stats.profit / stats.stake) * 100).toFixed(2))
        : 0;
    const winRate =
      stats.resolved > 0
        ? Number(((stats.won / stats.resolved) * 100).toFixed(1))
        : 0;

    const monthlyBreakdown: Record<string, BookmakerMonthlyBreakdown> = {};
    for (const [mKey, mStat] of stats.monthlyMap.entries()) {
      const mRoi =
        mStat.stake > 0
          ? Number(((mStat.profit / mStat.stake) * 100).toFixed(2))
          : 0;
      monthlyBreakdown[mKey] = {
        monthKey: mStat.monthKey,
        monthLabel: mStat.monthLabel,
        profit: Number(mStat.profit.toFixed(2)),
        betsCount: mStat.betsCount,
        stake: Number(mStat.stake.toFixed(2)),
        wonBets: mStat.wonBets,
        lostBets: mStat.lostBets,
        roi: mRoi,
      };
    }

    result.push({
      bookmaker,
      betsCount: stats.betsCount,
      stake: Number(stats.stake.toFixed(2)),
      totalStake: Number(stats.totalStake.toFixed(2)),
      profit: Number(stats.profit.toFixed(2)),
      roi,
      winRate,
      wonBets: stats.won,
      lostBets: stats.lost,
      pendingBets: stats.pending,
      voidBets: stats.voidCount,
      monthlyBreakdown,
    });
  }

  // Ordenar: primero las que tienen apuestas en la vista activa (por beneficio descendente),
  // y luego las demás casas del historial alfabéticamente
  return result.sort((a, b) => {
    const hasA = a.betsCount > 0 ? 1 : 0;
    const hasB = b.betsCount > 0 ? 1 : 0;
    if (hasA !== hasB) return hasB - hasA;
    if (b.profit !== a.profit) return b.profit - a.profit;
    return a.bookmaker.localeCompare(b.bookmaker);
  });
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

/**
 * Extrae una fecha YYYY-MM-DD estable evitando desplazamientos por zona horaria
 */
export function extractStableYMD(bet: Bet): string | null {
  const raw = bet.event_date || bet.created_at;
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseLocalDateFromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * 1. Rendimiento por Rangos de Cuota (con comparación Win Rate real vs implícito)
 */
export function calculateOddsRangeStats(bets: Bet[]): OddsRangeStat[] {
  const buckets = [
    { range: '< 1.50', min: 0, max: 1.5 },
    { range: '1.50 - 1.99', min: 1.5, max: 2.0 },
    { range: '2.00 - 2.99', min: 2.0, max: 3.0 },
    { range: '3.00 - 4.99', min: 3.0, max: 5.0 },
    { range: '5.00+', min: 5.0, max: Infinity },
  ];

  const resolved = bets.filter((b) => b.status === 'won' || b.status === 'lost');

  return buckets.map((bucket) => {
    const matched = resolved.filter(
      (b) => b.odds >= bucket.min && b.odds < bucket.max
    );
    const wonBets = matched.filter((b) => b.status === 'won').length;
    const lostBets = matched.filter((b) => b.status === 'lost').length;
    const betsCount = matched.length;
    const stake = matched.reduce((acc, b) => acc + (b.stake || 0), 0);
    const profit = matched.reduce((acc, b) => acc + (b.profit || 0), 0);
    const roi = stake > 0 ? Number(((profit / stake) * 100).toFixed(2)) : 0;
    const winRate =
      betsCount > 0 ? Number(((wonBets / betsCount) * 100).toFixed(1)) : 0;
    const avgOdds =
      betsCount > 0
        ? Number(
            (
              matched.reduce((acc, b) => acc + (b.odds || 0), 0) / betsCount
            ).toFixed(2)
          )
        : 0;
    const impliedWinRate =
      avgOdds > 0 ? Number(((1 / avgOdds) * 100).toFixed(1)) : 0;
    const edgePercent =
      betsCount > 0 ? Number((winRate - impliedWinRate).toFixed(1)) : 0;

    return {
      range: bucket.range,
      betsCount,
      wonBets,
      lostBets,
      stake: Number(stake.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      roi,
      winRate,
      avgOdds,
      impliedWinRate,
      edgePercent,
    };
  });
}

/**
 * 2. Eficiencia por Tamaño de Stake
 */
export function calculateStakeRangeStats(bets: Bet[]): StakeRangeStat[] {
  const resolved = bets.filter((b) => b.status === 'won' || b.status === 'lost');
  const hasZeroStake = resolved.some((b) => (b.stake || 0) <= 0);

  const buckets: Array<{ range: string; min: number; max: number }> = [
    ...(hasZeroStake ? [{ range: 'Bono (0€)', min: -Infinity, max: 0.0001 }] : []),
    { range: '≤ 5€', min: 0.0001, max: 5.0001 },
    { range: '5.01 - 10€', min: 5.0001, max: 10.0001 },
    { range: '10.01 - 20€', min: 10.0001, max: 20.0001 },
    { range: '20.01 - 50€', min: 20.0001, max: 50.0001 },
    { range: '> 50€', min: 50.0001, max: Infinity },
  ];

  return buckets.map((bucket) => {
    const matched = resolved.filter((b) => {
      const s = b.stake || 0;
      return s >= bucket.min && s < bucket.max;
    });
    const wonBets = matched.filter((b) => b.status === 'won').length;
    const lostBets = matched.filter((b) => b.status === 'lost').length;
    const betsCount = matched.length;
    const stake = matched.reduce((acc, b) => acc + (b.stake || 0), 0);
    const profit = matched.reduce((acc, b) => acc + (b.profit || 0), 0);
    const roi = stake > 0 ? Number(((profit / stake) * 100).toFixed(2)) : 0;
    const winRate =
      betsCount > 0 ? Number(((wonBets / betsCount) * 100).toFixed(1)) : 0;

    return {
      range: bucket.range,
      betsCount,
      wonBets,
      lostBets,
      stake: Number(stake.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      roi,
      winRate,
    };
  });
}

/**
 * 3. Rendimiento por Día de la Semana (Lunes a Domingo)
 */
export function calculateWeekdayStats(bets: Bet[]): WeekdayStat[] {
  const daysMeta = [
    { dayIndex: 0, dayLabel: 'Lunes', shortLabel: 'Lun' },
    { dayIndex: 1, dayLabel: 'Martes', shortLabel: 'Mar' },
    { dayIndex: 2, dayLabel: 'Miércoles', shortLabel: 'Mié' },
    { dayIndex: 3, dayLabel: 'Jueves', shortLabel: 'Jue' },
    { dayIndex: 4, dayLabel: 'Viernes', shortLabel: 'Vie' },
    { dayIndex: 5, dayLabel: 'Sábado', shortLabel: 'Sáb' },
    { dayIndex: 6, dayLabel: 'Domingo', shortLabel: 'Dom' },
  ];

  const accumulators = daysMeta.map((meta) => ({
    ...meta,
    betsCount: 0,
    wonBets: 0,
    lostBets: 0,
    stake: 0,
    profit: 0,
  }));

  const resolved = bets.filter((b) => b.status === 'won' || b.status === 'lost');

  for (const bet of resolved) {
    const ymd = extractStableYMD(bet);
    if (!ymd) continue;
    const d = parseLocalDateFromYMD(ymd);
    // Convertir getDay() (0=Dom..6=Sab) a 0=Lun..6=Dom
    const idx = (d.getDay() + 6) % 7;
    const target = accumulators[idx];
    target.betsCount += 1;
    target.stake += bet.stake || 0;
    target.profit += bet.profit || 0;
    if (bet.status === 'won') target.wonBets += 1;
    if (bet.status === 'lost') target.lostBets += 1;
  }

  return accumulators.map((item) => {
    const roi =
      item.stake > 0 ? Number(((item.profit / item.stake) * 100).toFixed(2)) : 0;
    const winRate =
      item.betsCount > 0
        ? Number(((item.wonBets / item.betsCount) * 100).toFixed(1))
        : 0;
    return {
      dayIndex: item.dayIndex,
      dayLabel: item.dayLabel,
      shortLabel: item.shortLabel,
      betsCount: item.betsCount,
      wonBets: item.wonBets,
      lostBets: item.lostBets,
      stake: Number(item.stake.toFixed(2)),
      profit: Number(item.profit.toFixed(2)),
      roi,
      winRate,
    };
  });
}

/**
 * 4. Análisis de Riesgo, Drawdown y Rachas Históricas
 */
export function calculateRiskAndStreakMetrics(bets: Bet[]): RiskStreakMetrics {
  const resolved = bets
    .filter((b) => b.status === 'won' || b.status === 'lost')
    .sort((a, b) => {
      const ymdA = extractStableYMD(a) || a.created_at;
      const ymdB = extractStableYMD(b) || b.created_at;
      if (ymdA !== ymdB) return ymdA.localeCompare(ymdB);
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  let grossWins = 0;
  let grossLosses = 0;
  let maxSingleWin = 0;
  let maxSingleLoss = 0;
  let bestWinStreak = 0;
  let worstLossStreak = 0;
  let curWinStreak = 0;
  let curLossStreak = 0;

  const dailyMap = new Map<string, number>();

  for (const b of resolved) {
    const profit = b.profit || 0;
    if (profit > 0) {
      grossWins += profit;
      if (profit > maxSingleWin) maxSingleWin = profit;
    } else if (profit < 0) {
      grossLosses += Math.abs(profit);
      if (profit < maxSingleLoss) maxSingleLoss = profit;
    }

    if (b.status === 'won') {
      curWinStreak += 1;
      curLossStreak = 0;
      if (curWinStreak > bestWinStreak) bestWinStreak = curWinStreak;
    } else if (b.status === 'lost') {
      curLossStreak += 1;
      curWinStreak = 0;
      if (curLossStreak > worstLossStreak) worstLossStreak = curLossStreak;
    }

    const ymd = extractStableYMD(b);
    if (ymd) {
      dailyMap.set(ymd, (dailyMap.get(ymd) || 0) + profit);
    }
  }

  const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => a.localeCompare(b));
  const shortMonths = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  const fullMonths = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  let cumulative = 0;
  let peak = 0; // El bankroll parte de 0€ antes de la primera apuesta
  let maxDrawdown = 0;
  let maxDrawdownDate = '';
  let positiveDays = 0;
  let negativeDays = 0;
  let breakEvenDays = 0;

  const drawdownSeries: DrawdownPoint[] = [];

  for (const ymd of sortedDates) {
    const dailyProfit = dailyMap.get(ymd) || 0;
    if (dailyProfit > 0.001) positiveDays++;
    else if (dailyProfit < -0.001) negativeDays++;
    else breakEvenDays++;

    cumulative += dailyProfit;
    if (cumulative > peak) peak = cumulative;
    const drawdown = Number((cumulative - peak).toFixed(2));
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownDate = ymd;
    }

    const [year, month, day] = ymd.split('-');
    const mIdx = parseInt(month, 10) - 1;
    const formattedDate = `${parseInt(day, 10)} ${shortMonths[mIdx] || month}`;
    const fullDate = `${parseInt(day, 10)} de ${fullMonths[mIdx] || month}, ${year}`;

    drawdownSeries.push({
      date: ymd,
      formattedDate,
      fullDate,
      cumulativeProfit: Number(cumulative.toFixed(2)),
      peakProfit: Number(peak.toFixed(2)),
      drawdown,
      dailyProfit: Number(dailyProfit.toFixed(2)),
    });
  }

  const activeDays = sortedDates.length;
  const positiveDaysRate =
    activeDays > 0 ? Number(((positiveDays / activeDays) * 100).toFixed(1)) : 0;
  const totalNet = grossWins - grossLosses;
  const avgDailyProfit =
    activeDays > 0 ? Number((totalNet / activeDays).toFixed(2)) : 0;
  const profitFactor =
    grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : null;

  return {
    drawdownSeries,
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    maxDrawdownDate,
    profitFactor,
    grossWins: Number(grossWins.toFixed(2)),
    grossLosses: Number(grossLosses.toFixed(2)),
    bestWinStreak,
    worstLossStreak,
    maxSingleWin: Number(maxSingleWin.toFixed(2)),
    maxSingleLoss: Number(maxSingleLoss.toFixed(2)),
    activeDays,
    positiveDays,
    negativeDays,
    breakEvenDays,
    positiveDaysRate,
    avgDailyProfit,
  };
}

/**
 * 5. Datos diarios para el Calendario Heatmap
 */
export function calculateDailyHeatmapData(
  bets: Bet[]
): Record<string, DailyHeatmapDay> {
  const resolved = bets.filter((b) => b.status === 'won' || b.status === 'lost');
  const result: Record<string, DailyHeatmapDay> = {};

  for (const bet of resolved) {
    const ymd = extractStableYMD(bet);
    if (!ymd) continue;

    if (!result[ymd]) {
      result[ymd] = {
        date: ymd,
        profit: 0,
        betsCount: 0,
        wonBets: 0,
        lostBets: 0,
        stake: 0,
      };
    }

    const entry = result[ymd];
    entry.profit = Number((entry.profit + (bet.profit || 0)).toFixed(2));
    entry.betsCount += 1;
    entry.stake = Number((entry.stake + (bet.stake || 0)).toFixed(2));
    if (bet.status === 'won') entry.wonBets += 1;
    if (bet.status === 'lost') entry.lostBets += 1;
  }

  return result;
}

/**
 * 6. Estadísticas avanzadas y rankings de Casas de Apuestas
 */
export function calculateAdvancedBookmakerInsights(
  bets: Bet[]
): AdvancedBookmakerInsights {
  const canonicalMap = new Map<string, string>();
  for (const bet of bets) {
    const raw = (bet.bookmaker || '').trim();
    if (!raw) continue;
    const lower = raw.toLowerCase();
    if (!canonicalMap.has(lower)) {
      canonicalMap.set(lower, raw);
    } else {
      const existing = canonicalMap.get(lower)!;
      if (raw[0] === raw[0].toUpperCase() && existing[0] !== existing[0].toUpperCase()) {
        canonicalMap.set(lower, raw);
      }
    }
  }

  const map = new Map<
    string,
    {
      betsCount: number;
      resolvedCount: number;
      wonBets: number;
      lostBets: number;
      pendingBets: number;
      stake: number;
      profit: number;
      oddsSum: number;
      oddsCount: number;
      maxWin: number;
    }
  >();

  let totalBetsCount = 0;
  let totalResolvedStake = 0;

  for (const bet of bets) {
    const raw = (bet.bookmaker || '').trim();
    const bookmaker = raw ? canonicalMap.get(raw.toLowerCase()) || raw : 'Sin casa';
    const cur = map.get(bookmaker) || {
      betsCount: 0,
      resolvedCount: 0,
      wonBets: 0,
      lostBets: 0,
      pendingBets: 0,
      stake: 0,
      profit: 0,
      oddsSum: 0,
      oddsCount: 0,
      maxWin: 0,
    };

    cur.betsCount += 1;
    totalBetsCount += 1;

    if (bet.odds > 0) {
      cur.oddsSum += bet.odds;
      cur.oddsCount += 1;
    }

    if (bet.status === 'won' || bet.status === 'lost') {
      cur.resolvedCount += 1;
      cur.stake += bet.stake || 0;
      totalResolvedStake += bet.stake || 0;
      cur.profit += bet.profit || 0;
      if (bet.status === 'won') {
        cur.wonBets += 1;
        if ((bet.profit || 0) > cur.maxWin) {
          cur.maxWin = bet.profit || 0;
        }
      } else {
        cur.lostBets += 1;
      }
    } else if (bet.status === 'pending') {
      cur.pendingBets += 1;
    }

    map.set(bookmaker, cur);
  }

  const items: AdvancedBookmakerStat[] = [];
  for (const [bookmaker, s] of map.entries()) {
    const roi = s.stake > 0 ? Number(((s.profit / s.stake) * 100).toFixed(2)) : 0;
    const winRate =
      s.resolvedCount > 0
        ? Number(((s.wonBets / s.resolvedCount) * 100).toFixed(1))
        : 0;
    const avgOdds =
      s.oddsCount > 0 ? Number((s.oddsSum / s.oddsCount).toFixed(2)) : 0;
    const avgStake =
      s.resolvedCount > 0 ? Number((s.stake / s.resolvedCount).toFixed(2)) : 0;
    const volumeSharePercent =
      totalBetsCount > 0
        ? Number(((s.betsCount / totalBetsCount) * 100).toFixed(1))
        : 0;

    items.push({
      bookmaker,
      betsCount: s.betsCount,
      resolvedCount: s.resolvedCount,
      wonBets: s.wonBets,
      lostBets: s.lostBets,
      pendingBets: s.pendingBets,
      stake: Number(s.stake.toFixed(2)),
      profit: Number(s.profit.toFixed(2)),
      roi,
      winRate,
      avgOdds,
      avgStake,
      volumeSharePercent,
      maxWin: Number(s.maxWin.toFixed(2)),
    });
  }

  items.sort((a, b) => b.profit - a.profit);

  const resolvedItems = items.filter((i) => i.resolvedCount > 0);
  const itemsWithStake = items.filter((i) => i.stake > 0);

  const topProfitBookmaker =
    resolvedItems.length > 0
      ? [...resolvedItems].sort((a, b) => b.profit - a.profit)[0]
      : null;

  const worstProfitBookmaker =
    resolvedItems.length > 0
      ? [...resolvedItems].sort((a, b) => a.profit - b.profit)[0]
      : null;

  const mostBetsBookmaker =
    items.length > 0
      ? [...items].sort((a, b) => b.betsCount - a.betsCount)[0]
      : null;

  const highestStakeBookmaker =
    itemsWithStake.length > 0
      ? [...itemsWithStake].sort((a, b) => b.stake - a.stake)[0]
      : null;

  const bestRoiBookmaker =
    itemsWithStake.length > 0
      ? [...itemsWithStake].sort((a, b) => b.roi - a.roi)[0]
      : null;

  const bestWinRateBookmaker =
    resolvedItems.length > 0
      ? [...resolvedItems].sort((a, b) => b.winRate - a.winRate)[0]
      : null;

  return {
    items,
    topProfitBookmaker,
    worstProfitBookmaker,
    mostBetsBookmaker,
    highestStakeBookmaker,
    bestRoiBookmaker,
    bestWinRateBookmaker,
    totalBetsCount,
    totalResolvedStake: Number(totalResolvedStake.toFixed(2)),
  };
}



