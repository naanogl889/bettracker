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

export interface BookmakerStat {
  bookmaker: string;
  betsCount: number;
  stake: number;
  profit: number;
  roi: number;
  winRate: number;
}

export interface SportStat {
  sport: string;
  betsCount: number;
  stake: number;
  profit: number;
  roi: number;
  winRate: number;
}
