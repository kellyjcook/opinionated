import { useNavigate } from 'react-router';
import { useAuth } from '../state/authContext';
import { useGame } from '../state/gameContext';
import { Button } from '../components/ui/Button';

export function HomeScreen() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const { dispatch } = useGame();

  const handleNewGame = () => {
    dispatch({ type: 'START_NEW_GAME' });
    navigate('/setup');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-[#f8f9fa]">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-[#1a73e8] mb-3">Opinionated</h1>
        <p className="text-lg text-[#5f6368]">The party game of hot takes</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-[300px]">
        <Button onClick={handleNewGame} size="lg" className="w-full text-xl py-5">
          New Game
        </Button>
      </div>

      {/* Account info */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2">
        {profile && (
          <p className="text-sm text-[#5f6368]">
            Signed in as <span className="font-semibold">{profile.display_name || profile.email}</span>
          </p>
        )}
        <button
          onClick={logout}
          className="text-sm text-[#5f6368] underline hover:text-[#202124]"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
