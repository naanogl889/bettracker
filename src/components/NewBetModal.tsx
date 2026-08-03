import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Zap,
  Calendar,
  Trophy,
  DollarSign,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { Bet } from '../types/bets';
import { COMMON_BOOKMAKERS, COMMON_SPORTS } from '../data/sampleBets';

interface NewBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBet: (
    bet: Omit<Bet, 'id' | 'created_at' | 'status' | 'profit'> & {
      status?: 'pending' | 'won' | 'lost' | 'void';
      profit?: number;
      category?: 'value' | 'matched';
    }
  ) => void;
}

export const NewBetModal: React.FC<NewBetModalProps> = ({
  isOpen,
  onClose,
  onAddBet,
}) => {
  const [category, setCategory] = useState<'value' | 'matched'>('value');
  const [stake, setStake] = useState<string>('10');
  const [odds, setOdds] = useState<string>('2');
  const [matchedProfit, setMatchedProfit] = useState<string>('15');
  const [matchedStatus, setMatchedStatus] = useState<'won' | 'pending'>('won');
  const [bookmaker, setBookmaker] = useState<string>(() => {
    return localStorage.getItem('bt_last_bookmaker') || 'Bet365';
  });
  const [event, setEvent] = useState<string>('');
  const [sport, setSport] = useState<string>(() => {
    return localStorage.getItem('bt_last_sport') || 'Fútbol';
  });
  const [eventDate, setEventDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [error, setError] = useState<string | null>(null);

  const stakeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Recuperar última casa y deporte de localStorage al abrir
      const lastBm = localStorage.getItem('bt_last_bookmaker');
      const lastSp = localStorage.getItem('bt_last_sport');
      if (lastBm) setBookmaker(lastBm);
      if (lastSp) setSport(lastSp);

      setTimeout(() => {
        stakeInputRef.current?.focus();
        stakeInputRef.current?.select();
      }, 30);
    }
  }, [isOpen]);

  // Atajo de teclado Esc para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericStake = parseFloat(stake.replace(',', '.'));
    const numericOdds = parseFloat(odds.replace(',', '.'));
    const numericMatchedProfit = parseFloat(matchedProfit.replace(',', '.'));

    if (category === 'value') {
      if (isNaN(numericStake) || numericStake <= 0) {
        setError('Introduce un stake (cantidad apostada) válido mayor a 0');
        stakeInputRef.current?.focus();
        return;
      }
      if (isNaN(numericOdds) || numericOdds < 1.01) {
        setError('La cuota debe ser un número decimal mayor a 1.00 (ej: 1.85)');
        return;
      }
    } else {
      // Validación para Matched Betting / Promociones
      if (isNaN(numericMatchedProfit)) {
        setError('Introduce el beneficio esperado o garantizado (€)');
        return;
      }
    }

    if (!bookmaker.trim()) {
      setError('Debes especificar una casa de apuestas');
      return;
    }

    // Recordar última casa y deporte para agilizar próximas apuestas
    localStorage.setItem('bt_last_bookmaker', bookmaker.trim());
    if (sport.trim()) {
      localStorage.setItem('bt_last_sport', sport.trim());
    }

    if (category === 'value') {
      onAddBet({
        stake: numericStake,
        odds: numericOdds,
        bookmaker: bookmaker.trim(),
        event: event.trim() || undefined,
        sport: sport.trim() || undefined,
        event_date: eventDate || undefined,
        category: 'value',
      });
    } else {
      // Registro de Matched Betting / Bono
      onAddBet({
        stake: isNaN(numericStake) || numericStake <= 0 ? 0 : numericStake,
        odds: isNaN(numericOdds) || numericOdds <= 1 ? 1.0 : numericOdds,
        bookmaker: bookmaker.trim(),
        event: event.trim() ? `[MATCHED] ${event.trim()}` : '[MATCHED] Bono / Promoción',
        sport: sport.trim() || 'Promociones',
        event_date: eventDate || undefined,
        status: matchedStatus,
        profit: matchedStatus === 'won' ? numericMatchedProfit : 0,
        category: 'matched',
      });
    }

    // Reiniciar evento para la siguiente apuesta
    setEvent('');
    setError(null);
    onClose();
  };

  const potentialProfit =
    !isNaN(parseFloat(stake.replace(',', '.'))) &&
    !isNaN(parseFloat(odds.replace(',', '.')))
      ? (
          parseFloat(stake.replace(',', '.')) *
          (parseFloat(odds.replace(',', '.')) - 1)
        ).toFixed(2)
      : '0.00';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera modal limpia estilo Linear / Stripe */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                category === 'value'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
              }`}
            >
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {category === 'value' ? 'Nueva Apuesta de Valor' : 'Nuevo Matched Betting'}
              </h2>
              <p className="text-xs text-zinc-400">
                {category === 'value'
                  ? 'Tabulación rápida: Stake → Cuota → Casa → Evento → Deporte → Guardar'
                  : 'Bonos, surebets y promociones — se suman directamente a tu balance y ROI'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de categoría: Valor vs Matched Betting */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40">
          <button
            type="button"
            onClick={() => setCategory('value')}
            className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
              category === 'value'
                ? 'text-emerald-400 border-emerald-500 bg-emerald-500/5'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            <span>📈 Apuesta de Valor (+EV)</span>
          </button>
          <button
            type="button"
            onClick={() => setCategory('matched')}
            className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
              category === 'matched'
                ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            <span>🎁 Matched Betting / Bono</span>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {category === 'value' ? (
            /* Fila 1: Stake y Cuota (Apuesta de Valor - intacto) */
            <div className="grid grid-cols-2 gap-4">
              {/* Stake (Tab 1) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>1. STAKE (€)*</span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    Tab 1
                  </span>
                </label>
                <div className="relative">
                  <input
                    ref={stakeInputRef}
                    tabIndex={1}
                    type="text"
                    inputMode="decimal"
                    required={category === 'value'}
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono font-bold text-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-semibold">
                    €
                  </span>
                </div>
                {/* Presets rápidos de stake */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {[10, 20, 50, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        setStake(val.toString());
                        stakeInputRef.current?.focus();
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
                        stake === val.toString()
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold'
                          : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {val}€
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuota (Tab 2) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>2. CUOTA*</span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    Tab 2
                  </span>
                </label>
                <input
                  tabIndex={2}
                  type="text"
                  inputMode="decimal"
                  required={category === 'value'}
                  value={odds}
                  onChange={(e) => setOdds(e.target.value)}
                  placeholder="2"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono font-bold text-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition"
                />
                <div className="flex items-center justify-between mt-1.5 text-[11px] text-zinc-400 font-mono">
                  <span>Ganancia potencial:</span>
                  <span className="text-emerald-400 font-bold">
                    +{potentialProfit} €
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Fila alternativa para Matched Betting / Promociones */
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>BENEFICIO DE LA PROMOCIÓN (€)*</span>
                  <span className="text-[10px] text-indigo-400 font-normal">
                    Asegurado / Libre
                  </span>
                </label>
                <div className="relative">
                  <input
                    ref={stakeInputRef}
                    tabIndex={1}
                    type="text"
                    inputMode="decimal"
                    required={category === 'matched'}
                    value={matchedProfit}
                    onChange={(e) => setMatchedProfit(e.target.value)}
                    placeholder="15"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-indigo-500/70 text-white font-mono font-bold text-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/50 transition"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-semibold">
                    €
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Ej: +15€ libres de bono de bienvenida, freebet o surebet.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  ESTADO DE PROMOCIÓN
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchedStatus('won')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      matchedStatus === 'won'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>✅ Liberado / Ya Ganado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchedStatus('pending')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      matchedStatus === 'pending'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>⏳ Pendiente de resolución</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Casa de Apuestas (Tab 3) */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>3. CASA DE APUESTAS*</span>
              <span className="text-[10px] text-zinc-500 font-normal">
                Tab 3 (Recordada automáticamente)
              </span>
            </label>
            <input
              tabIndex={3}
              type="text"
              required
              value={bookmaker}
              onChange={(e) => setBookmaker(e.target.value)}
              placeholder="Ej: Bet365, Betfair, William Hill..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition"
            />
            {/* Presets de casas */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_BOOKMAKERS.map((bm) => (
                <button
                  key={bm}
                  type="button"
                  tabIndex={-1}
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

          {/* Evento (Tab 4) y Deporte (Tab 5) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>4. EVENTO (Opcional)</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  Tab 4
                </span>
              </label>
              <input
                tabIndex={4}
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="Ej: Real Madrid vs Barcelona"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>5. DEPORTE (Opcional)</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  Tab 5 (Recordado)
                </span>
              </label>
              <select
                tabIndex={5}
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition"
              >
                <option value="">Seleccionar deporte...</option>
                {COMMON_SPORTS.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha del evento discreta */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>FECHA DEL EVENTO (Opcional)</span>
            </label>
            <input
              type="date"
              tabIndex={-1}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Footer de botones con Enter en Tab 6 */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            <span className="text-[11px] text-zinc-500">
              Pulsa <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono">Enter</kbd> en cualquier campo para guardar
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                tabIndex={-1}
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                Cancelar
              </button>
              <button
                tabIndex={6}
                type="submit"
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>6. Guardar Apuesta</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

