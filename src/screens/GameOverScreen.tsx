import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../state/gameContext';
import { PLAYER_COLORS, idealTextColor } from '../lib/colors';
import { Button } from '../components/ui/Button';

export function GameOverScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useGame();

  const sortedPlayers = useMemo(
    () => [...state.players].sort((a, b) => b.cubesPlaced - a.cubesPlaced || b.score - a.score),
    [state.players]
  );

  const winner = sortedPlayers[0];

  const handlePlayAgain = () => {
    dispatch({ type: 'RESET_GAME' });
    navigate('/setup');
  };

  const handleHome = () => {
    dispatch({ type: 'RESET_GAME' });
    navigate('/');
  };

  if (!winner) return null;

  const { hex } = PLAYER_COLORS[winner.color];
  const textColor = idealTextColor(hex);

  return (
    <div className="h-full flex flex-col items-center justify-center p-[9px] bg-[#f8f9fa] gap-4">
      {/* Winner announcement */}
      <div className="text-center">
        <p className="text-lg text-[#5f6368] mb-2">The most opinionated player is...</p>
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold mx-auto mb-4 shadow-lg"
          style={{ backgroundColor: hex, color: textColor }}
        >
          {winner.name.charAt(0)}
        </div>
        <h1 className="text-4xl font-bold text-[#202124] mb-1">{winner.name}!</h1>
        <p className="text-[#5f6368]">
          {winner.cubesPlaced} cubes placed &middot; {winner.score} total points
        </p>
      </div>

      {/* Final standings */}
      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.1)] overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-[#dadce0]">
          <p className="text-sm font-semibold text-[#5f6368] text-center">Final Standings</p>
        </div>
        {sortedPlayers.map((player, i) => {
          const { hex: pHex } = PLAYER_COLORS[player.color];
          const pTextColor = idealTextColor(pHex);

          return (
            <div
              key={player.id}
              className="flex items-center gap-3 p-3 border-b border-[#dadce0] last:border-0"
            >
              <span className="text-lg font-bold text-[#5f6368] w-6">{i + 1}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: pHex, color: pTextColor }}
              >
                {player.name.charAt(0)}
              </div>
              <span className="flex-1 font-medium text-[#202124]">{player.name}</span>
              <div className="flex gap-0.5 mr-2">
                {[0, 1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className={`w-3 h-3 rounded-sm ${
                      j < player.cubesPlaced ? 'bg-[#4caf50]' : 'bg-[#dadce0]'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-[#5f6368]">{player.score} pts</span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-[300px]">
        <Button onClick={handlePlayAgain} size="lg" className="w-full">
          Play Again
        </Button>
        <Button onClick={handleHome} variant="secondary" size="md" className="w-full">
          Back to Home
        </Button>
      </div>
    </div>
  );
}
