import { useGame } from '../../state/gameContext';
import { PLAYER_COLORS, idealTextColor } from '../../lib/colors';
import { Button } from '../../components/ui/Button';

export function ActivePlayerReadyView() {
  const { state, dispatch } = useGame();
  const activePlayer = state.players[state.activePlayerIndex];

  if (!activePlayer) return null;

  const { hex } = PLAYER_COLORS[activePlayer.color];
  const textColor = idealTextColor(hex);

  return (
    <div
      className="h-full flex flex-col items-center justify-center p-6 gap-8"
      style={{ backgroundColor: hex }}
    >
      <div className="text-center" style={{ color: textColor }}>
        <p className="text-lg font-semibold mb-2">{activePlayer.name} chose:</p>
        <div className="text-8xl font-bold mb-4">{state.chosenNumber}</div>
        <p className="text-lg opacity-80">for "{state.currentScenario?.text}"</p>
      </div>

      <div className="bg-white/20 rounded-xl p-6 text-center max-w-[350px]" style={{ color: textColor }}>
        <p className="text-lg font-semibold mb-2">Now pass the device!</p>
        <p className="text-sm opacity-80">
          Place the device face-down on the table. The other players will pick it up to see the scenario.
        </p>
      </div>

      <Button
        onClick={() => dispatch({ type: 'START_GUESSING' })}
        variant="secondary"
        size="lg"
        className="w-full max-w-[300px]"
      >
        Other Players Ready
      </Button>
    </div>
  );
}
