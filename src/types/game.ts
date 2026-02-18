export type PlayerColor = 'red' | 'orange' | 'darkblue' | 'lightblue' | 'yellow' | 'green' | 'purple' | 'lime';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  seatOrder: number;
  score: number;
  cubesPlaced: number; // 0-4, wins at 4
}

export interface Scenario {
  id: string;
  text: string;
  category?: string;
}

export interface TurnResult {
  playerId: string;
  playerName: string;
  playerColor: PlayerColor;
  liftTimeMs: number;
  targetTimeMs: number;
  deltaMs: number;
  absDeltaMs: number;
  pointsEarned: number;
}

export type GamePhase =
  | 'home'
  | 'setup'
  | 'activePlayerRating'
  | 'activePlayerReady'
  | 'guessingDisplay'
  | 'touchWaiting'
  | 'countdown'
  | 'fingerTracking'
  | 'resultAssignment'
  | 'scoring'
  | 'gameOver';

export interface FingerResult {
  touchId: number;
  liftTimeMs: number;
}

export interface GameState {
  phase: GamePhase;
  gameId: string | null;
  players: Player[];
  scenarios: Scenario[];
  usedScenarioIds: Set<string>;
  currentRound: number;
  activePlayerIndex: number;
  currentScenario: Scenario | null;
  chosenNumber: number | null;
  turnResults: TurnResult[];
  fingerResults: FingerResult[];
  countdownStartTime: number | null;
  expectedFingerCount: number;
}
