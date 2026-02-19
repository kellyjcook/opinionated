import { useState, useMemo } from 'react';
import { useGame } from '../../state/gameContext';
import { canPlaceCube, checkWinner, pickRandomScenario } from '../../lib/scoring';
import { PLAYER_COLORS, idealTextColor } from '../../lib/colors';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { logError } from '../../lib/errors';

export function ScoringView() {
  const { state, dispatch } = useGame();
  const [cubePlaced, setCubePlaced] = useState<Set<string>>(new Set());

  const activePlayer = state.players[state.activePlayerIndex];
  const sortedResults = useMemo(
    () => [...state.turnResults].sort((a, b) => b.pointsEarned - a.pointsEarned || a.absDeltaMs - b.absDeltaMs),
    [state.turnResults]
  );

  const handlePlaceCube = (playerId: string) => {
    if (cubePlaced.has(playerId)) return;
    dispatch({ type: 'PLACE_CUBE', playerId });
    setCubePlaced(new Set([...cubePlaced, playerId]));
  };

  const handleNextTurn = async () => {
    // Persist turn results to Supabase (fire-and-forget)
    if (state.gameId) {
      try {
        const { data: turnData } = await supabase
          .from('turns')
          .insert({
            game_id: state.gameId,
            round_number: state.currentRound,
            active_player_id: activePlayer.id,
            scenario_id: state.currentScenario?.id,
            chosen_number: state.chosenNumber,
            status: 'completed',
          })
          .select('id')
          .single();

        if (turnData) {
          await supabase.from('guesses').insert(
            state.turnResults.map((r) => ({
              turn_id: turnData.id,
              player_id: r.playerId,
              lift_time_ms: r.liftTimeMs,
              target_time_ms: r.targetTimeMs,
              delta_ms: r.deltaMs,
              abs_delta_ms: r.absDeltaMs,
              points_earned: r.pointsEarned,
            }))
          );

          // Update player scores in DB
          for (const player of state.players) {
            await supabase
              .from('players')
              .update({ score: player.score, cubes_placed: player.cubesPlaced })
              .eq('id', player.id);
          }
        }
      } catch (err) {
        logError('ScoringView:persistTurn', (err as Error).message);
      }
    }

    // Check for winner
    const winner = checkWinner(state.players);
    if (winner) {
      dispatch({ type: 'GAME_OVER', winnerId: winner.id });
      return;
    }

    // Next turn
    dispatch({ type: 'NEXT_TURN' });

    // Pick next scenario
    const scenario = pickRandomScenario(state.scenarios, state.usedScenarioIds);
    if (scenario) {
      dispatch({ type: 'BEGIN_TURN', scenario });
    }
  };

  return (
    <div className="h-full flex flex-col p-[9px] gap-3 overflow-auto">
      {/* Reveal answer */}
      <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.1)] p-4 text-center">
        <p className="text-sm text-[#5f6368] mb-1">
          {activePlayer.name} rated "{state.currentScenario?.text}"
        </p>
        <p className="text-5xl font-bold text-[#1a73e8]">{state.chosenNumber}</p>
        <p className="text-sm text-[#5f6368] mt-1">
          Target: {state.chosenNumber}.00 seconds
        </p>
      </div>

      {/* Results table */}
      <div className="space-y-2">
        {sortedResults.map((result) => {
          const { hex } = PLAYER_COLORS[result.playerColor];
          const textColor = idealTextColor(hex);
          const player = state.players.find((p) => p.id === result.playerId)!;
          const showCubeButton = canPlaceCube(player.cubesPlaced, result.pointsEarned) && !cubePlaced.has(result.playerId);
          const hasPlacedCube = cubePlaced.has(result.playerId);

          const pointsLabel =
            result.pointsEarned === 3 ? 'Closest!' :
            result.pointsEarned === 2 ? 'Within 0.5s' :
            result.pointsEarned === 1 ? 'Right side' : 'Miss';

          const bgColor =
            result.pointsEarned === 3 ? '#e8f5e9' :
            result.pointsEarned >= 1 ? '#fff8e1' : '#ffebee';

          return (
            <div
              key={result.playerId}
              className="rounded-lg p-4 flex items-center gap-3"
              style={{ backgroundColor: bgColor }}
            >
              {/* Player badge */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: hex, color: textColor }}
              >
                {result.playerName.charAt(0)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#202124] truncate">{result.playerName}</p>
                <p className="text-sm text-[#5f6368]">
                  {(result.liftTimeMs / 1000).toFixed(2)}s ({result.deltaMs > 0 ? '+' : ''}{(result.deltaMs / 1000).toFixed(2)}s)
                </p>
              </div>

              {/* Points */}
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-[#202124]">{result.pointsEarned}</p>
                <p className="text-xs text-[#5f6368]">{pointsLabel}</p>
              </div>

              {/* Cube placement */}
              {showCubeButton && (
                <button
                  onClick={() => handlePlaceCube(result.playerId)}
                  className="px-3 py-2 bg-[#4caf50] text-white text-xs font-bold rounded-lg active:scale-95 transition-transform"
                >
                  Place Cube
                </button>
              )}
              {hasPlacedCube && (
                <span className="text-xs text-[#4caf50] font-semibold">Placed!</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Cube reminder */}
      <div className="bg-[#fff8e1] rounded-lg p-3 text-center">
        <p className="text-xs text-[#5f6368]">
          Players with points: move one speech cube onto your megaphone!
          <br />Only 1 cube per turn. Unused points are lost.
        </p>
      </div>

      <Button onClick={handleNextTurn} size="lg" className="w-full">
        Next Turn
      </Button>
    </div>
  );
}
