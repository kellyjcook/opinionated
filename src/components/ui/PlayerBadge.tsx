import type { PlayerColor } from '../../types/game';
import { PLAYER_COLORS, idealTextColor } from '../../lib/colors';

interface PlayerBadgeProps {
  name: string;
  color: PlayerColor;
  isActive?: boolean;
  score?: number;
  cubesPlaced?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function PlayerBadge({ name, color, isActive, score, cubesPlaced, size = 'md' }: PlayerBadgeProps) {
  const { hex } = PLAYER_COLORS[color];
  const textColor = idealTextColor(hex);

  const sizes = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-24 h-24 text-base',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold transition-all duration-200 ${
          isActive ? 'ring-4 ring-[#ff9800] ring-offset-2' : ''
        }`}
        style={{ backgroundColor: hex, color: textColor }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <span className="text-xs font-medium truncate max-w-[80px]">{name}</span>
      {score !== undefined && (
        <span className="text-xs text-[#5f6368]">{score} pts</span>
      )}
      {cubesPlaced !== undefined && (
        <div className="flex gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-sm ${
                i < cubesPlaced ? 'bg-[#4caf50]' : 'bg-[#dadce0]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
