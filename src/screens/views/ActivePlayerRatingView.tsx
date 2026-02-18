import { useGame } from '../../state/gameContext';
import { NumberPicker } from '../../components/ui/NumberPicker';
import { Button } from '../../components/ui/Button';
import { PlayerBadge } from '../../components/ui/PlayerBadge';

export function ActivePlayerRatingView() {
  const { state, dispatch } = useGame();
  const activePlayer = state.players[state.activePlayerIndex];

  if (!activePlayer || !state.currentScenario) return null;

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
      {/* Active player indicator */}
      <div className="flex flex-col items-center gap-2">
        <PlayerBadge name={activePlayer.name} color={activePlayer.color} isActive size="lg" />
        <p className="text-sm text-[#5f6368]">You're on the Soap Box!</p>
      </div>

      {/* Scenario */}
      <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.1)] p-6 w-full max-w-[400px] text-center">
        <p className="text-xs text-[#5f6368] uppercase tracking-wide mb-2">Scenario</p>
        <h3 className="text-2xl font-bold text-[#202124]">{state.currentScenario.text}</h3>
      </div>

      {/* Scale explanation */}
      <div className="flex justify-between w-full max-w-[360px] text-xs text-[#5f6368]">
        <span>1 = Worst</span>
        <span>10 = Best</span>
      </div>

      {/* Number picker */}
      <NumberPicker
        selected={state.chosenNumber}
        onSelect={(n) => dispatch({ type: 'CHOOSE_NUMBER', number: n })}
        playerColor={activePlayer.color}
      />

      {/* Ready button */}
      <Button
        onClick={() => dispatch({ type: 'ACTIVE_PLAYER_READY' })}
        disabled={state.chosenNumber === null}
        size="lg"
        className="w-full max-w-[360px]"
      >
        Ready
      </Button>
    </div>
  );
}
