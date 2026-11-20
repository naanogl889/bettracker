export type BetStatus = 'pending' | 'won' | 'lost' | 'void';

export interface Bet {
  id: string;
  created_at: string; // ISO timestamp
  updated_at?: string; // ISO timestamp de última modificación (sincronización nube)
  stake: number;      // Cantidad apostada
  odds: number;       // Cuota (ej: 1.85)
  bookmaker: string;  // Casa de apuestas (ej: Bet365, Pinnacle)
  event?: string;     // Evento opcional (ej: Real Madrid vs Barcelona)
  sport?: string;     // Deporte opcional (ej: Fútbol, Tenis, Baloncesto)
  event_date?: string; // Fecha del evento opcional (ISO string o YYYY-MM-DD)
  status: BetStatus;  // Estado: pendiente, ganada, perdida, nula
  profit: number;     // Beneficio calculado
  notes?: string;     // Notas opcionales
  category?: 'value' | 'matched'; // Estrategia: valor o matched betting (promociones, bonos, surebets)
}

export interface BetFilter {
  bookmaker?: string;
  status?: BetStatus | 'all';
  category?: 'all' | 'value' | 'matched';
  sport?: string;
  dateRange?: 'all' | 'today' | '7days' | '30days' | 'this_month' | 'custom';
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy: 'created_at' | 'event_date' | 'stake' | 'odds' | 'profit';
  sortOrder: 'asc' | 'desc';
}

export interface DashboardMetrics {
  totalProfit: number;
  roi: number; // ROI % = (totalProfit / totalStake) * 100
  totalBets: number;
  resolvedBets: number;
  wonBets: number;
  lostBets: number;
  voidBets: number;
  pendingBets: number;
  winRate: number; // %
  totalStake: number;
  avgOdds: number;
  maxWin: number;
  maxLoss: number;
}

export interface CumulativeProfitPoint {
  date: string;
  formattedDate: string;
  dailyProfit: number;
  cumulativeProfit: number;
  betCount: number;
}

export interface BookmakerMonthlyBreakdown {
  monthKey: string; // '2026-09'
  monthLabel: string; // 'Sep 26' or 'Septiembre 2026'
  profit: number;
  betsCount: number;
  stake: number;
  wonBets: number;
  lostBets: number;
  roi: number;
}

export interface BookmakerStat {
  bookmaker: string;
  betsCount: number;
  stake: number;
  profit: number;
  roi: number;
  winRate: number;
  wonBets?: number;
  lostBets?: number;
  pendingBets?: number;
  voidBets?: number;
  totalStake?: number;
  monthlyBreakdown?: Record<string, BookmakerMonthlyBreakdown>; // monthKey -> breakdown
}

export interface SportStat {
  sport: string;
  betsCount: number;
  stake: number;
  profit: number;
  roi: number;
  winRate: number;
}

export interface OddsRangeStat {
  range: string;
  betsCount: number;
  wonBets: number;
  lostBets: number;
  stake: number;
  profit: number;
  roi: number;
  winRate: number;
  avgOdds: number;
  impliedWinRate: number;
  edgePercent: number;
}

export interface StakeRangeStat {
  range: string;
  betsCount: number;
  wonBets: number;
  lostBets: number;
  stake: number;
  profit: number;
  roi: number;
  winRate: number;
}

export interface WeekdayStat {
  dayIndex: number; // 0 = Lun ... 6 = Dom
  dayLabel: string;
  shortLabel: string;
  betsCount: number;
  wonBets: number;
  lostBets: number;
  stake: number;
  profit: number;
  roi: number;
  winRate: number;
}

export interface DrawdownPoint {
  date: string;
  formattedDate: string;
  fullDate: string;
  cumulativeProfit: number;
  peakProfit: number;
  drawdown: number;
  dailyProfit: number;
}

export interface RiskStreakMetrics {
  drawdownSeries: DrawdownPoint[];
  maxDrawdown: number;
  maxDrawdownDate: string;
  profitFactor: number | null; // null cuando no hay pérdidas (infinito)
  grossWins: number;
  grossLosses: number;
  bestWinStreak: number;
  worstLossStreak: number;
  maxSingleWin: number;
  maxSingleLoss: number;
  activeDays: number;
  positiveDays: number;
  negativeDays: number;
  breakEvenDays: number;
  positiveDaysRate: number;
  avgDailyProfit: number;
}

export interface DailyHeatmapDay {
  date: string; // YYYY-MM-DD
  profit: number;
  betsCount: number;
  wonBets: number;
  lostBets: number;
  stake: number;
}

export interface AdvancedBookmakerStat {
  bookmaker: string;
  betsCount: number;
  resolvedCount: number;
  wonBets: number;
  lostBets: number;
  pendingBets: number;
  stake: number;
  profit: number;
  roi: number;
  winRate: number;
  avgOdds: number;
  avgStake: number;
  volumeSharePercent: number;
  maxWin: number;
}

export interface AdvancedBookmakerInsights {
  items: AdvancedBookmakerStat[];
  topProfitBookmaker: AdvancedBookmakerStat | null;
  worstProfitBookmaker: AdvancedBookmakerStat | null;
  mostBetsBookmaker: AdvancedBookmakerStat | null;
  highestStakeBookmaker: AdvancedBookmakerStat | null;
  bestRoiBookmaker: AdvancedBookmakerStat | null;
  bestWinRateBookmaker: AdvancedBookmakerStat | null;
  totalBetsCount: number;
  totalResolvedStake: number;
}

