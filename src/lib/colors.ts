import type { PlayerColor } from '../types/game';

export const PLAYER_COLORS: Record<PlayerColor, { hex: string; name: string }> = {
  red:       { hex: '#e90600', name: 'Red' },
  orange:    { hex: '#F27622', name: 'Orange' },
  darkblue:  { hex: '#131541', name: 'Dark Blue' },
  lightblue: { hex: '#46A1D9', name: 'Light Blue' },
  yellow:    { hex: '#FBE348', name: 'Yellow' },
  green:     { hex: '#1A626A', name: 'Green' },
  purple:    { hex: '#8e24aa', name: 'Purple' },
  lime:      { hex: '#7cb342', name: 'Lime' },
};

export const COLOR_ORDER: PlayerColor[] = [
  'red', 'orange', 'darkblue', 'lightblue', 'yellow', 'green', 'purple', 'lime',
];

/** Returns black or white text color based on background luminance (from WaitingGameApp) */
export function idealTextColor(bgHex: string): string {
  const hex = bgHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#202124' : '#ffffff';
}
