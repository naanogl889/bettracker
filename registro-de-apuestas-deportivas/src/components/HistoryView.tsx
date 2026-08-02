import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Calendar,
  Building2,
  Trophy,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Bet, BetFilter, BetStatus } from '../types/bets';
import { COMMON_BOOKMAKERS, COMMON_SPORTS } from '../data/sampleBets';

interface HistoryViewProps {
  bets: Bet[];
  onEditBet: (bet: Bet) => void;
  onDeleteBet: (id: string) => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onRestoreSample: () => void;
  onClearAll: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  bets,
  onEditBet,
  onDeleteBet,
  onExportJson,
  onExportCsv,
  onRestoreSample,
  onClearAll,
}) => {
  const [search, setSearch] = useState('');
  const [bookmakerFilter, setBookmakerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | BetStatus>('all');
  const [sportFilter, setSportFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<
    'all' | 'today' | '7days' | '30days'
  >('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'event_date' | 'stake' | 'odds' | 'profit'>(
    'created_at'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedBetDetail, setSelectedBetDetail] = useState<Bet | null>(null);

  // Lista única de bookmakers en uso
  const usedBookmakers = useMemo(() => {
    const set = new Set<string>();
    bets.forEach((b) => {
      if (b.bookmaker) set.add(b.bookmaker);
    });
    return Array.from(set).sort();
  }, [bets]);

  // Lista única de deportes en uso
  const usedSports = useMemo(() => {
    const set = new Set<string>();
    bets.forEach((b) => {
      if (b.sport) set.add(b.sport);
    });
    return Array.from(set).sort();
  }, [bets]);

  // Filtrado y Ordenación
  const filteredBets = useMemo(() => {
    const now = new Date().getTime();

    return bets
      .filter((bet) => {
        // Búsqueda por texto (evento, casa, deporte)
        if (search.trim()) {
          const query = search.toLowerCase();
          const matchEvent = bet.event?.toLowerCase().includes(query) || false;
          const matchBookmaker =
            bet.bookmaker?.toLowerCase().includes(query) || false;
          const matchSport = bet.sport?.toLowerCase().includes(query) || false;
          if (!matchEvent && !matchBookmaker && !matchSport) {
            return false;
          }
        }

        // Casa de apuestas
        if (
          bookmakerFilter !== 'all' &&
          bet.bookmaker.toLowerCase() !== bookmakerFilter.toLowerCase()
        ) {
          return false;
        }

        // Estado
        if (statusFilter !== 'all' && bet.status !== statusFilter) {
          return false;
        }

        // Deporte
        if (
          sportFilter !== 'all' &&
          (bet.sport || 'General / Otros').toLowerCase() !==
            sportFilter.toLowerCase()
        ) {
          return false;
        }

        // Rango de fechas
        if (dateRangeFilter !== 'all') {
          const betDate = new Date(bet.event_date || bet.created_at).getTime();
          const diffDays = (now - betDate) / (1000 * 3600 * 24);

          if (dateRangeFilter === 'today' && diffDays > 1.5) return false;
          if (dateRangeFilter === '7days' && diffDays > 7.5) return false;
          if (dateRangeFilter === '30days' && diffDays > 30.5) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy];
        let valB: any = b[sortBy];

        if (sortBy === 'created_at' || sortBy === 'event_date') {
          valA = new Date(a[sortBy] || a.created_at).getTime();
          valB = new Date(b[sortBy] || b.created_at).getTime();
        }

        if (sortOrder === 'asc') {
          return valA > valB ? 1 : -1;
        }
        return valA < valB ? 1 : -1;
      });
  }, [
    bets,
    search,
    bookmakerFilter,
    statusFilter,
    sportFilter,
    dateRangeFilter,
    sortBy,
    sortOrder,
  ]);

  const totalFilteredProfit = useMemo(() => {
    return filteredBets.reduce((acc, b) => acc + (b.profit || 0), 0);
  }, [filteredBets]);

  const toggleSort = (
    field: 'created_at' | 'event_date' | 'stake' | 'odds' | 'profit'
  ) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera y Exportaciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Historial de Apuestas
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Mostrando <strong className="text-white">{filteredBets.length}</strong>{' '}
            de <strong className="text-white">{bets.length}</strong> apuestas
            registradas
            {filteredBets.length > 0 && (
              <>
                {' '}
                • Beneficio filtrado:{' '}
                <strong
                  className={`font-mono ${
                    totalFilteredProfit >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {totalFilteredProfit >= 0 ? '+' : ''}
                  {totalFilteredProfit.toFixed(2)}€
                </strong>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Exportar JSON y CSV */}
          <button
            onClick={onExportJson}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition"
            title="Exportar archivo JSON completo"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>JSON</span>
          </button>

          <button
            onClick={onExportCsv}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition"
            title="Exportar a Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          {/* Botón restaurar ejemplo */}
          <button
            onClick={onRestoreSample}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 flex items-center gap-1.5 transition"
            title="Restaurar apuestas de demostración"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar datos</span>
          </button>

          {/* Botón vaciar todo (con confirmación) */}
          {confirmClear ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  onClearAll();
                  setConfirmClear(false);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition"
              >
                ¿Confirmar vaciado?
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition"
              title="Borrar todo el historial"
            >
              Vaciar todo
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento, casa..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Filtro: Casa de Apuestas */}
          <div>
            <select
              value={bookmakerFilter}
              onChange={(e) => setBookmakerFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Todas las casas</option>
              {usedBookmakers.map((bm) => (
                <option key={bm} value={bm}>
                  {bm}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro: Estado */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | BetStatus)
              }
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">⏳ Pendiente</option>
              <option value="won">✅ Ganada</option>
              <option value="lost">❌ Perdida</option>
              <option value="void">⚪ Nula</option>
            </select>
          </div>

          {/* Filtro: Deporte */}
          <div>
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Todos los deportes</option>
              {usedSports.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro: Rango de Fechas */}
          <div>
            <select
              value={dateRangeFilter}
              onChange={(e) =>
                setDateRangeFilter(
                  e.target.value as 'all' | 'today' | '7days' | '30days'
                )
              }
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Cualquier fecha</option>
              <option value="today">Hoy</option>
              <option value="7days">Últimos 7 días</option>
              <option value="30days">Últimos 30 días</option>
            </select>
          </div>
        </div>

        {/* Chips de ordenación */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Ordenar por:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'created_at', label: 'Fecha registro' },
              { id: 'event_date', label: 'Fecha evento' },
              { id: 'stake', label: 'Stake' },
              { id: 'odds', label: 'Cuota' },
              { id: 'profit', label: 'Beneficio' },
            ].map((col) => {
              const active = sortBy === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => toggleSort(col.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  <span>{col.label}</span>
                  {active && (
                    <span className="text-[10px]">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla del Historial */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Evento / Deporte</th>
                <th className="py-3.5 px-4">Casa</th>
                <th className="py-3.5 px-4 text-right">Stake</th>
                <th className="py-3.5 px-4 text-right">Cuota</th>
                <th className="py-3.5 px-4 text-right">Beneficio</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredBets.length > 0 ? (
                filteredBets.map((bet) => {
                  const isWon = bet.status === 'won';
                  const isLost = bet.status === 'lost';
                  const isPending = bet.status === 'pending';

                  return (
                    <tr
                      key={bet.id}
                      onClick={() => setSelectedBetDetail(bet)}
                      className={`transition group cursor-pointer border-b border-zinc-800/40 ${
                        isWon
                          ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                          : isLost
                          ? 'bg-rose-500/5 hover:bg-rose-500/10'
                          : isPending
                          ? 'bg-amber-500/5 hover:bg-amber-500/10'
                          : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      {/* Fecha */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-white">
                          {bet.event_date
                            ? bet.event_date
                            : bet.created_at.split('T')[0]}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {new Date(bet.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isWon && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span>✅</span> Ganada
                          </span>
                        )}
                        {isLost && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <span>❌</span> Perdida
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <span>⏳</span> Pendiente
                          </span>
                        )}
                        {bet.status === 'void' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                            <span>⚪</span> Nula
                          </span>
                        )}
                      </td>

                      {/* Evento y deporte */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-white truncate">
                          {bet.event || 'Sin evento especificado'}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {bet.sport || 'Fútbol'}
                        </div>
                      </td>

                      {/* Casa de apuestas */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-zinc-300">
                        {bet.bookmaker}
                      </td>

                      {/* Stake */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                        {bet.stake} €
                      </td>

                      {/* Cuota */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-300 whitespace-nowrap">
                        @{bet.odds}
                      </td>

                      {/* Beneficio */}
                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                          isWon
                            ? 'text-emerald-400'
                            : isLost
                            ? 'text-rose-400'
                            : 'text-zinc-500'
                        }`}
                      >
                        {isWon ? '+' : ''}
                        {bet.profit.toFixed(2)} €
                      </td>

                      {/* Acciones */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditBet(bet)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                            title="Editar apuesta"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteBet(bet.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Eliminar apuesta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-zinc-500 text-sm"
                  >
                    No se han encontrado apuestas con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalles de Apuesta con Edición rápida */}
      {selectedBetDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedBetDetail(null)}
        >
          <div
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedBetDetail.status === 'won'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : selectedBetDetail.status === 'lost'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {selectedBetDetail.status === 'won' && '✅ Ganada'}
                  {selectedBetDetail.status === 'lost' && '❌ Perdida'}
                  {selectedBetDetail.status === 'pending' && '⏳ Pendiente'}
                  {selectedBetDetail.status === 'void' && '⚪ Nula'}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {selectedBetDetail.event_date ||
                    selectedBetDetail.created_at.split('T')[0]}
                </span>
              </div>
              <button
                onClick={() => setSelectedBetDetail(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                {selectedBetDetail.event ||
                  `Apuesta en ${selectedBetDetail.sport || 'Deporte'}`}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Casa de apuestas:{' '}
                <strong className="text-zinc-200">
                  {selectedBetDetail.bookmaker}
                </strong>{' '}
                • Deporte:{' '}
                <strong className="text-zinc-200">
                  {selectedBetDetail.sport || 'General'}
                </strong>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                  Stake
                </span>
                <span className="text-base font-bold font-mono text-white">
                  {selectedBetDetail.stake}€
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                  Cuota
                </span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  @{selectedBetDetail.odds}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                  Beneficio
                </span>
                <span
                  className={`text-base font-bold font-mono ${
                    selectedBetDetail.profit > 0
                      ? 'text-emerald-400'
                      : selectedBetDetail.profit < 0
                      ? 'text-rose-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {selectedBetDetail.profit > 0 ? '+' : ''}
                  {selectedBetDetail.profit.toFixed(2)}€
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedBetDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  const bet = selectedBetDetail;
                  setSelectedBetDetail(null);
                  onEditBet(bet);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md transition flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar Apuesta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

