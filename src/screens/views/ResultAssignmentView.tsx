import { useState, useMemo } from 'react';
import { useGame } from '../../state/gameContext';
import { calculateScores, mapFingerResultsToScoring } from '../../lib/scoring';
import { PLAYER_COLORS, idealTextColor } from '../../lib/colors';
import { Button } from '../../components/ui/Button';
import type { FingerResult } from '../../types/game';

/**
 * Post-hoc player-to-finger assignment.
 * Each finger result is shown sorted by lift time.
 * Players tap to claim their result.
 */
export function ResultAssignmentView() {
  const { state, dispatch } = useGame();
  const [assignments, setAssignments] = useState<Map<string, FingerResult>>(new Map());

  const guessingPlayers = useMemo(
    () => state.players.filter((_, i) => i !== state.activePlayerIndex),
    [state.players, state.activePlayerIndex]
  );

  const sortedResults = useMemo(
    () => [...state.fingerResults].sort((a, b) => a.liftTimeMs - b.liftTimeMs),
    [state.fingerResults]
  );

  const assignedTouchIds = useMemo(
    () => new Set(Array.from(assignments.values()).map((r) => r.touchId)),
    [assignments]
  );

  const assignedPlayerIds = useMemo(
    () => new Set(assignments.keys()),
    [assignments]
  );

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const handleAssign = (fingerResult: FingerResult) => {
    if (!selectedPlayer) return;
    if (assignedTouchIds.has(fingerResult.touchId)) return;
    if (assignedPlayerIds.has(selectedPlayer)) return;

    const updated = new Map(assignments);
    updated.set(selectedPlayer, fingerResult);
    setAssignments(updated);
    setSelectedPlayer(null);
  };

  const handleUnassign = (playerId: string) => {
    const updated = new Map(assignments);
    updated.delete(playerId);
    setAssignments(updated);
  };

  const allAssigned = assignments.size === guessingPlayers.length;

  const handleConfirm = () => {
    if (!allAssigned || state.chosenNumber === null) return;

    const inputs = mapFingerResultsToScoring(assignments, state.players, state.chosenNumber);
    const results = calculateScores(inputs);
    dispatch({ type: 'SET_TURN_RESULTS', results });
  };

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-auto">
      <h2 className="text-xl font-bold text-center text-[#202124]">Claim Your Result</h2>
      <p className="text-sm text-center text-[#5f6368]">
        Each player: tap your name, then tap your timing result
      </p>

      {/* Player selection row */}
      <div className="flex flex-wrap justify-center gap-2">
        {guessingPlayers.map((player) => {
          const isAssigned = assignedPlayerIds.has(player.id);
          const isSelected = selectedPlayer === player.id;
          const { hex } = PLAYER_COLORS[player.color];
          const textColor = idealTextColor(hex);

          return (
            <button
              key={player.id}
              onClick={() => {
                if (isAssigned) {
                  handleUnassign(player.id);
                } else {
                  setSelectedPlayer(isSelected ? null : player.id);
                }
              }}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                isAssigned ? 'opacity-40 line-through' : ''
              } ${isSelected ? 'ring-4 ring-[#ff9800] ring-offset-2 scale-105' : ''}`}
              style={{ backgroundColor: hex, color: textColor }}
            >
              {player.name}
            </button>
          );
        })}
      </div>

      {/* Finger results */}
      <div className="space-y-2">
        {sortedResults.map((result, i) => {
          const isAssigned = assignedTouchIds.has(result.touchId);
          const assignedPlayer = Array.from(assignments.entries()).find(
            ([_, r]) => r.touchId === result.touchId
          );

          return (
            <button
              key={result.touchId}
              onClick={() => handleAssign(result)}
              disabled={isAssigned || !selectedPlayer}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                isAssigned
                  ? 'border-[#4caf50] bg-[#e8f5e9]'
                  : selectedPlayer
                  ? 'border-[#1a73e8] bg-white hover:bg-blue-50 cursor-pointer'
                  : 'border-[#dadce0] bg-white opacity-60'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-[#5f6368]">Finger #{i + 1}</span>
                  <p className="text-lg font-bold text-[#202124]">
                    {(result.liftTimeMs / 1000).toFixed(2)}s
                  </p>
                </div>
                {assignedPlayer && (
                  <span
                    className="px-3 py-1 rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: PLAYER_COLORS[
                        state.players.find((p) => p.id === assignedPlayer[0])!.color
                      ].hex,
                      color: idealTextColor(
                        PLAYER_COLORS[
                          state.players.find((p) => p.id === assignedPlayer[0])!.color
                        ].hex
                      ),
                    }}
                  >
                    {state.players.find((p) => p.id === assignedPlayer[0])!.name}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Button onClick={handleConfirm} disabled={!allAssigned} size="lg" className="w-full mt-4">
        See Results
      </Button>
    </div>
  );
}
