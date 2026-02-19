import type { TurnResult, FingerResult, Player } from '../types/game';

export interface ScoringInput {
  playerId: string;
  playerName: string;
  playerColor: Player['color'];
  liftTimeMs: number;
  targetTimeMs: number;
}

/**
 * Calculate scores for a round of Opinionated.
 * - Closest to target time: 3 points
 * - Within 0.5s (500ms) of target: 2 points
 * - Correct side (1-5 vs 6-10): 1 point
 * - All others: 0 points
 */
export function calculateScores(inputs: ScoringInput[]): TurnResult[] {
  const results: TurnResult[] = inputs.map((input) => {
    const deltaMs = input.liftTimeMs - input.targetTimeMs;
    const absDeltaMs = Math.abs(deltaMs);
    return {
      playerId: input.playerId,
      playerName: input.playerName,
      playerColor: input.playerColor,
      liftTimeMs: input.liftTimeMs,
      targetTimeMs: input.targetTimeMs,
      deltaMs,
      absDeltaMs,
      pointsEarned: 0,
    };
  });

  // Sort by absolute delta (closest first)
  results.sort((a, b) => a.absDeltaMs - b.absDeltaMs);

  if (results.length === 0) return results;

  // Find the closest delta (could be tied)
  const closestDelta = results[0].absDeltaMs;

  for (const result of results) {
    // Closest player(s) get 3 points
    if (Math.abs(result.absDeltaMs - closestDelta) < 1) {
      result.pointsEarned = 3;
      continue;
    }

    // Within 500ms of target gets 2 points
    if (result.absDeltaMs <= 500) {
      result.pointsEarned = 2;
      continue;
    }

    // On the correct "side" (1-5s = low side, 6-10s = high side) gets 1 point
    const targetSide = result.targetTimeMs <= 5000 ? 'low' : 'high';
    const guessSide = result.liftTimeMs <= 5000 ? 'low' : 'high';
    if (targetSide === guessSide) {
      result.pointsEarned = 1;
      continue;
    }

    result.pointsEarned = 0;
  }

  return results;
}

/** Check if a player can place a cube this turn */
export function canPlaceCube(cubesPlaced: number, pointsEarned: number): boolean {
  return pointsEarned > 0 && cubesPlaced < 4;
}

/** Check if any player has won (all 4 cubes placed) */
export function checkWinner(players: Player[]): Player | null {
  return players.find((p) => p.cubesPlaced >= 4) ?? null;
}

/** Get next active player index (counter-clockwise) */
export function nextActivePlayerIndex(current: number, playerCount: number): number {
  return (current - 1 + playerCount) % playerCount;
}

/** Pick a random unused scenario */
export function pickRandomScenario(
  scenarios: { id: string; text: string; category?: string }[],
  usedIds: Set<string>
): { id: string; text: string; category?: string } | null {
  const available = scenarios.filter((s) => !usedIds.has(s.id));
  if (available.length === 0) {
    // All used — reset and pick from full pool
    if (scenarios.length === 0) return null;
    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

/** Map finger results to scoring inputs when players claim their results */
export function mapFingerResultsToScoring(
  assignments: Map<string, FingerResult>, // playerId -> fingerResult
  players: Player[],
  chosenNumber: number
): ScoringInput[] {
  const targetTimeMs = chosenNumber * 1000;
  return Array.from(assignments.entries()).map(([playerId, fingerResult]) => {
    const player = players.find((p) => p.id === playerId)!;
    return {
      playerId,
      playerName: player.name,
      playerColor: player.color,
      liftTimeMs: fingerResult.liftTimeMs,
      targetTimeMs,
    };
  });
}

/**
 * Auto-map finger results to players when using per-player buttons.
 * touchId = index into guessingPlayers array (players excluding active player).
 */
export function autoMapFingerResults(
  fingerResults: FingerResult[],
  allPlayers: Player[],
  activePlayerIndex: number,
  chosenNumber: number
): ScoringInput[] {
  const guessingPlayers = allPlayers.filter((_, i) => i !== activePlayerIndex);
  const targetTimeMs = chosenNumber * 1000;

  return fingerResults.map((result) => {
    const player = guessingPlayers[result.touchId];
    return {
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      liftTimeMs: result.liftTimeMs,
      targetTimeMs,
    };
  });
}
