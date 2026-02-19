import type { GameState, Player, Scenario, FingerResult, TurnResult } from '../types/game';
import { autoMapFingerResults, calculateScores } from '../lib/scoring';

export type GameAction =
  | { type: 'START_NEW_GAME' }
  | { type: 'SET_PLAYERS'; players: Player[] }
  | { type: 'SET_GAME_ID'; gameId: string }
  | { type: 'LOAD_SCENARIOS'; scenarios: Scenario[] }
  | { type: 'BEGIN_TURN'; scenario: Scenario }
  | { type: 'CHOOSE_NUMBER'; number: number }
  | { type: 'ACTIVE_PLAYER_READY' }
  | { type: 'START_GUESSING' }
  | { type: 'START_TOUCH_PHASE' }
  | { type: 'START_COUNTDOWN'; startTime: number }
  | { type: 'CANCEL_COUNTDOWN' }
  | { type: 'RECORD_FINGER_LIFT'; touchId: number; liftTimeMs: number }
  | { type: 'ALL_FINGERS_LIFTED'; results: FingerResult[] }
  | { type: 'SET_TURN_RESULTS'; results: TurnResult[] }
  | { type: 'PLACE_CUBE'; playerId: string }
  | { type: 'NEXT_TURN' }
  | { type: 'GAME_OVER'; winnerId: string }
  | { type: 'RESET_GAME' };

export const initialGameState: GameState = {
  phase: 'home',
  gameId: null,
  players: [],
  scenarios: [],
  usedScenarioIds: new Set(),
  currentRound: 0,
  activePlayerIndex: 0,
  currentScenario: null,
  chosenNumber: null,
  turnResults: [],
  fingerResults: [],
  countdownStartTime: null,
  expectedFingerCount: 0,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_NEW_GAME':
      return {
        ...initialGameState,
        phase: 'setup',
        scenarios: state.scenarios, // keep loaded scenarios
      };

    case 'SET_PLAYERS':
      return {
        ...state,
        players: action.players,
      };

    case 'SET_GAME_ID':
      return {
        ...state,
        gameId: action.gameId,
      };

    case 'LOAD_SCENARIOS':
      return {
        ...state,
        scenarios: action.scenarios,
      };

    case 'BEGIN_TURN':
      return {
        ...state,
        phase: 'activePlayerRating',
        currentRound: state.currentRound + 1,
        currentScenario: action.scenario,
        chosenNumber: null,
        turnResults: [],
        fingerResults: [],
        countdownStartTime: null,
        usedScenarioIds: new Set([...state.usedScenarioIds, action.scenario.id]),
        expectedFingerCount: state.players.length - 1, // all except active player
      };

    case 'CHOOSE_NUMBER':
      if (state.phase !== 'activePlayerRating') return state;
      return {
        ...state,
        chosenNumber: action.number,
      };

    case 'ACTIVE_PLAYER_READY':
      if (state.phase !== 'activePlayerRating' || state.chosenNumber === null) return state;
      return {
        ...state,
        phase: 'activePlayerReady',
      };

    case 'START_GUESSING':
      if (state.phase !== 'activePlayerReady') return state;
      return {
        ...state,
        phase: 'guessingDisplay',
      };

    case 'START_TOUCH_PHASE':
      if (state.phase !== 'guessingDisplay') return state;
      return {
        ...state,
        phase: 'touchWaiting',
      };

    case 'START_COUNTDOWN':
      if (state.phase !== 'touchWaiting') return state;
      return {
        ...state,
        phase: 'countdown',
        countdownStartTime: action.startTime,
      };

    case 'CANCEL_COUNTDOWN':
      return {
        ...state,
        phase: 'touchWaiting',
        countdownStartTime: null,
      };

    case 'RECORD_FINGER_LIFT':
      return {
        ...state,
        phase: 'fingerTracking',
        fingerResults: [
          ...state.fingerResults,
          { touchId: action.touchId, liftTimeMs: action.liftTimeMs },
        ],
      };

    case 'ALL_FINGERS_LIFTED': {
      // Per-player buttons: touchId = guessing player index.
      // Auto-map results and skip manual result assignment.
      if (state.chosenNumber !== null) {
        const inputs = autoMapFingerResults(
          action.results,
          state.players,
          state.activePlayerIndex,
          state.chosenNumber
        );
        const turnResults = calculateScores(inputs);
        return {
          ...state,
          phase: 'scoring',
          fingerResults: action.results,
          turnResults,
        };
      }
      // Fallback (should not happen)
      return {
        ...state,
        phase: 'resultAssignment',
        fingerResults: action.results,
      };
    }

    case 'SET_TURN_RESULTS':
      return {
        ...state,
        phase: 'scoring',
        turnResults: action.results,
      };

    case 'PLACE_CUBE': {
      const players = state.players.map((p) =>
        p.id === action.playerId ? { ...p, cubesPlaced: Math.min(p.cubesPlaced + 1, 4) } : p
      );
      // Also update score based on turnResults
      const turnResult = state.turnResults.find((r) => r.playerId === action.playerId);
      const updatedPlayers = players.map((p) =>
        p.id === action.playerId && turnResult
          ? { ...p, score: p.score + turnResult.pointsEarned }
          : p
      );
      return {
        ...state,
        players: updatedPlayers,
      };
    }

    case 'NEXT_TURN': {
      const nextIndex = (state.activePlayerIndex - 1 + state.players.length) % state.players.length;
      return {
        ...state,
        activePlayerIndex: nextIndex,
        currentScenario: null,
        chosenNumber: null,
        turnResults: [],
        fingerResults: [],
        countdownStartTime: null,
        phase: 'activePlayerRating',
      };
    }

    case 'GAME_OVER':
      return {
        ...state,
        phase: 'gameOver',
      };

    case 'RESET_GAME':
      return {
        ...initialGameState,
        scenarios: state.scenarios,
      };

    default:
      return state;
  }
}
