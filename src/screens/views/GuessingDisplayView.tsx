import { useGame } from '../../state/gameContext';
import { Button } from '../../components/ui/Button';
import { PlayerBadge } from '../../components/ui/PlayerBadge';

export function GuessingDisplayView() {
  const { state, dispatch } = useGame();
  const activePlayer = state.players[state.activePlayerIndex];
  const guessingPlayers = state.players.filter((_, i) => i !== state.activePlayerIndex);

  if (!state.currentScenario || !activePlayer) return null;

  return (
    <div className="h-full flex flex-col items-center justify-center p-[9px] gap-4">
      {/* Scenario card */}
      <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.1)] p-4 w-full max-w-[400px] text-center">
        <p className="text-xs text-[#5f6368] uppercase tracking-wide mb-2">
          {activePlayer.name}'s Scenario
        </p>
        <h3 className="text-2xl font-bold text-[#202124] mb-4">{state.currentScenario.text}</h3>
        <div className="flex justify-between text-xs text-[#5f6368] border-t border-[#dadce0] pt-3">
          <span>1 = Worst</span>
          <span>10 = Best</span>
        </div>
      </div>

      {/* Discussion prompt */}
      <div className="bg-[#fff8e1] rounded-lg p-4 w-full max-w-[400px] text-center">
        <p className="text-sm text-[#5f6368]">
          Discuss your guesses! What number did <span className="font-semibold">{activePlayer.name}</span> pick?
        </p>
      </div>

      {/* Guessing players */}
      <div className="flex flex-wrap justify-center gap-3">
        {guessingPlayers.map((p) => (
          <PlayerBadge key={p.id} name={p.name} color={p.color} size="sm" />
        ))}
      </div>

      {/* Ready button */}
      <Button
        onClick={() => dispatch({ type: 'START_TOUCH_PHASE' })}
        size="lg"
        className="w-full max-w-[360px]"
      >
        Ready to Guess!
      </Button>
    </div>
  );
}
