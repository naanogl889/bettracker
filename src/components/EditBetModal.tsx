import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Trophy, DollarSign, Calendar } from 'lucide-react';
import { Bet, BetStatus } from '../types/bets';
import { COMMON_BOOKMAKERS, COMMON_SPORTS } from '../data/sampleBets';

interface EditBetModalProps {
  bet: Bet | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBet: Bet) => void;
}

export const EditBetModal: React.FC<EditBetModalProps> = ({
  bet,
  isOpen,
  onClose,
  onSave,
}) => {
  const [stake, setStake] = useState<string>('');
  const [odds, setOdds] = useState<string>('');
  const [bookmaker, setBookmaker] = useState<string>('');
  const [event, setEvent] = useState<string>('');
  const [sport, setSport] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [status, setStatus] = useState<BetStatus>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bet && isOpen) {
      setStake(bet.stake.toString());
      setOdds(bet.odds.toString());
      setBookmaker(bet.bookmaker);
      setEvent(bet.event || '');
      setSport(bet.sport || 'Fútbol');
      setEventDate(bet.event_date || bet.created_at.split('T')[0]);
      setStatus(bet.status);
      setError(null);
    }
  }, [bet, isOpen]);

  if (!isOpen || !bet) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericStake = parseFloat(stake.replace(',', '.'));
    const numericOdds = parseFloat(odds.replace(',', '.'));

    if (isNaN(numericStake) || numericStake <= 0) {
      setError('Introduce un stake válido mayor a 0');
      return;
    }
    if (isNaN(numericOdds) || numericOdds < 1.01) {
      setError('La cuota debe ser mayor a 1.00');
      return;
    }
    if (!bookmaker.trim()) {
      setError('Debes especificar una casa de apuestas');
      return;
    }

    // Calcular beneficio real según estado modificado
    let profit = 0;
    if (status === 'won') {
      profit = Number((numericStake * (numericOdds - 1)).toFixed(2));
    } else if (status === 'lost') {
      profit = Number((-numericStake).toFixed(2));
    }

    onSave({
      ...bet,
      stake: numericStake,
      odds: numericOdds,
      bookmaker: bookmaker.trim(),
      event: event.trim() || undefined,
      sport: sport.trim() || undefined,
      event_date: eventDate || undefined,
      status,
      profit,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div>
            <h2 className="text-base font-bold text-white">Editar Apuesta</h2>
            <p className="text-xs text-zinc-400">ID: {bet.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Estado de la apuesta */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              ESTADO DE LA APUESTA
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'pending', label: '⏳ Pendiente' },
                { id: 'won', label: '✅ Ganada' },
                { id: 'lost', label: '❌ Perdida' },
                { id: 'void', label: '⚪ Nula' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatus(st.id as BetStatus)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition ${
                    status === st.id
                      ? st.id === 'won'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : st.id === 'lost'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-zinc-700/80 border-zinc-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                STAKE / APUESTA (€)*
              </label>
              <input
                type="number"
                step="any"
                required
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                CUOTA*
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              CASA DE APUESTAS*
            </label>
            <input
              type="text"
              required
              value={bookmaker}
              onChange={(e) => setBookmaker(e.target.value)}
              placeholder="Ej: Bet365, Betfair..."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm"
            />
            {/* Presets de casas */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_BOOKMAKERS.map((bm) => (
                <button
                  key={bm}
                  type="button"
                  onClick={() => setBookmaker(bm)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    bookmaker === bm
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-white'
                  }`}
                >
                  {bm}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                EVENTO
              </label>
              <input
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                DEPORTE
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm"
              >
                <option value="">Seleccionar...</option>
                {COMMON_SPORTS.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              FECHA DEL EVENTO
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
