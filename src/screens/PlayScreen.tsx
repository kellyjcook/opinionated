import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../state/gameContext';
import { ActivePlayerRatingView } from './views/ActivePlayerRatingView';
import { ActivePlayerReadyView } from './views/ActivePlayerReadyView';
import { GuessingDisplayView } from './views/GuessingDisplayView';
import { TouchTimerView } from './views/TouchTimerView';
import { ResultAssignmentView } from './views/ResultAssignmentView';
import { ScoringView } from './views/ScoringView';
import { ScoreBoard } from '../components/ui/ScoreBoard';

export function PlayScreen() {
  const { state } = useGame();
  const navigate = useNavigate();

  // Navigate to game over screen when game ends
  useEffect(() => {
    if (state.phase === 'gameOver') {
      navigate('/game-over');
    }
  }, [state.phase, navigate]);

  const showScoreBoard = !['touchWaiting', 'countdown', 'fingerTracking'].includes(state.phase);

  return (
    <div className="h-full flex flex-col bg-[#f8f9fa]">
      {/* Scoreboard header (hidden during touch phases) */}
      {showScoreBoard && (
        <ScoreBoard players={state.players} activePlayerIndex={state.activePlayerIndex} />
      )}

      {/* Phase-based content */}
      <div className="flex-1 relative">
        {state.phase === 'activePlayerRating' && <ActivePlayerRatingView />}
        {state.phase === 'activePlayerReady' && <ActivePlayerReadyView />}
        {state.phase === 'guessingDisplay' && <GuessingDisplayView />}
        {(state.phase === 'touchWaiting' || state.phase === 'countdown' || state.phase === 'fingerTracking') && (
          <TouchTimerView />
        )}
        {state.phase === 'resultAssignment' && <ResultAssignmentView />}
        {state.phase === 'scoring' && <ScoringView />}
      </div>
    </div>
  );
}
