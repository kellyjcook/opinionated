import type { PlayerColor } from '../../types/game';
import { PLAYER_COLORS, idealTextColor } from '../../lib/colors';

interface NumberPickerProps {
  selected: number | null;
  onSelect: (n: number) => void;
  playerColor: PlayerColor;
}

export function NumberPicker({ selected, onSelect, playerColor }: NumberPickerProps) {
  const { hex } = PLAYER_COLORS[playerColor];
  const textColor = idealTextColor(hex);

  return (
    <div className="grid grid-cols-5 gap-2 w-full max-w-[360px] mx-auto">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => onSelect(n)}
          className="aspect-square rounded-full text-2xl font-bold flex items-center justify-center transition-all duration-150 active:scale-90"
          style={
            selected === n
              ? { backgroundColor: hex, color: textColor, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }
              : { backgroundColor: '#ffffff', color: '#202124', border: '2px solid #dadce0' }
          }
        >
          {n}
        </button>
      ))}
    </div>
  );
}
