import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../state/gameContext';
import { useAuth } from '../state/authContext';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/errors';
import { fallbackScenarios } from '../lib/scenarios';
import { COLOR_ORDER, PLAYER_COLORS, idealTextColor } from '../lib/colors';
import { pickRandomScenario } from '../lib/scoring';
import { Button } from '../components/ui/Button';
import type { PlayerColor, Player, Scenario } from '../types/game';

export function SetupScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const [playerCount, setPlayerCount] = useState(3);
  const [playerNames, setPlayerNames] = useState<string[]>(
    Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`)
  );
  const [playerColors, setPlayerColors] = useState<PlayerColor[]>(COLOR_ORDER.slice(0, 8));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load scenarios on mount
  useEffect(() => {
    if (state.scenarios.length > 0) return;

    const loadScenarios = async () => {
      try {
        const { data, error } = await supabase
          .from('scenarios')
          .select('id, text, category');

        if (error || !data || data.length === 0) {
          dispatch({ type: 'LOAD_SCENARIOS', scenarios: fallbackScenarios });
          return;
        }

        dispatch({ type: 'LOAD_SCENARIOS', scenarios: data as Scenario[] });
      } catch (err) {
        logError('SetupScreen:loadScenarios', (err as Error).message);
        dispatch({ type: 'LOAD_SCENARIOS', scenarios: fallbackScenarios });
      }
    };

    loadScenarios();
  }, [dispatch, state.scenarios.length]);

  const handleNameChange = (index: number, name: string) => {
    const updated = [...playerNames];
    updated[index] = name;
    setPlayerNames(updated);
  };

  const cycleColor = (index: number) => {
    const usedColors = playerColors.filter((_, i) => i !== index && i < playerCount);
    const available = COLOR_ORDER.filter((c) => !usedColors.includes(c));
    const currentIdx = available.indexOf(playerColors[index]);
    const nextColor = available[(currentIdx + 1) % available.length];
    const updated = [...playerColors];
    updated[index] = nextColor;
    setPlayerColors(updated);
  };

  const handleStart = useCallback(async () => {
    setError('');

    // Validate names — use defaults for any blanks
    const names = playerNames.slice(0, playerCount).map((n, i) =>
      n.trim() || `Player ${i + 1}`
    );

    // Validate unique colors
    const colors = playerColors.slice(0, playerCount);
    if (new Set(colors).size !== colors.length) {
      setError('Each player must have a unique color');
      return;
    }

    setLoading(true);

    // Create players
    const players: Player[] = names.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      color: colors[i],
      seatOrder: i,
      score: 0,
      cubesPlaced: 0,
    }));

    dispatch({ type: 'SET_PLAYERS', players });

    // Create game in Supabase (fire-and-forget)
    try {
      const { data } = await supabase
        .from('games')
        .insert({
          host_user_id: user?.id,
          status: 'active',
          player_count: playerCount,
        })
        .select('id')
        .single();

      if (data) {
        dispatch({ type: 'SET_GAME_ID', gameId: data.id });

        // Insert players
        await supabase.from('players').insert(
          players.map((p) => ({
            id: p.id,
            game_id: data.id,
            name: p.name,
            color: p.color,
            seat_order: p.seatOrder,
          }))
        );
      }
    } catch (err) {
      logError('SetupScreen:createGame', (err as Error).message);
      // Continue even if Supabase write fails
    }

    // Pick first scenario and begin
    const scenario = pickRandomScenario(state.scenarios, state.usedScenarioIds);
    if (scenario) {
      dispatch({ type: 'BEGIN_TURN', scenario });
    }

    setLoading(false);
    navigate('/play');
  }, [playerCount, playerNames, playerColors, dispatch, state.scenarios, state.usedScenarioIds, user, navigate]);

  return (
    <div className="h-full flex flex-col bg-[#f8f9fa] overflow-auto">
      {/* Header */}
      <div className="pt-[9px] pb-2 text-center">
        <h2 className="text-2xl font-bold text-[#202124]">Game Setup</h2>
      </div>

      <div className="flex-1 px-[9px] pb-[9px] max-w-[500px] mx-auto w-full">
        {/* Player Count */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#202124] mb-2">
            Number of Players
          </label>
          <div className="flex gap-2 justify-center">
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`w-11 h-11 rounded-lg text-lg font-bold transition-all ${
                  playerCount === n
                    ? 'bg-[#1a73e8] text-white shadow-md'
                    : 'bg-white text-[#202124] border-2 border-[#dadce0]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Player Names & Colors */}
        <div className="space-y-2 mb-4">
          {Array.from({ length: playerCount }).map((_, i) => {
            const color = playerColors[i];
            const { hex } = PLAYER_COLORS[color];
            const textColor = idealTextColor(hex);

            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => cycleColor(i)}
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-transform active:scale-90 border-2 border-white shadow-md"
                  style={{ backgroundColor: hex, color: textColor }}
                  title="Tap to change color"
                >
                  {PLAYER_COLORS[color].name.slice(0, 2)}
                </button>
                <input
                  type="text"
                  value={playerNames[i]}
                  onChange={(e) => handleNameChange(i, e.target.value)}
                  maxLength={25}
                  placeholder={`Player ${i + 1}`}
                  className="flex-1 px-3 py-2 border-2 border-[#dadce0] rounded-lg text-base transition-colors focus:border-[#1a73e8] focus:outline-none"
                />
              </div>
            );
          })}
        </div>

        {error && <p className="text-[#c5221f] text-sm mb-3 text-center">{error}</p>}

        <Button onClick={handleStart} disabled={loading} size="lg" className="w-full">
          {loading ? 'Starting...' : 'Start Game'}
        </Button>
      </div>
    </div>
  );
}
