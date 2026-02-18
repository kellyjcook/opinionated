import type { Player } from '../../types/game';
import { PlayerBadge } from './PlayerBadge';

interface ScoreBoardProps {
  players: Player[];
  activePlayerIndex?: number;
}

export function ScoreBoard({ players, activePlayerIndex }: ScoreBoardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score || b.cubesPlaced - a.cubesPlaced);

  return (
    <div className="flex flex-wrap justify-center gap-4 p-3">
      {sorted.map((player, _i) => (
        <PlayerBadge
          key={player.id}
          name={player.name}
          color={player.color}
          isActive={activePlayerIndex !== undefined && players[activePlayerIndex]?.id === player.id}
          score={player.score}
          cubesPlaced={player.cubesPlaced}
          size="sm"
        />
      ))}
    </div>
  );
}
