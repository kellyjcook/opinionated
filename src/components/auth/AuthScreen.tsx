import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ConfirmScreen } from './ConfirmScreen';

export function AuthScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  if (showConfirm) {
    return <ConfirmScreen email={confirmEmail} onBack={() => setShowConfirm(false)} />;
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-[9px] bg-[#f8f9fa] overflow-auto">
      <div className="w-full max-w-[400px]">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1a73e8] mb-2">Opinionated</h1>
          <p className="text-[#5f6368]">The party game of hot takes</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white rounded-lg border-2 border-[#dadce0] mb-6 overflow-hidden">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === 'login' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:bg-gray-50'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === 'register' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:bg-gray-50'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Forms */}
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.1)] p-6">
          {tab === 'login' ? (
            <LoginForm />
          ) : (
            <RegisterForm
              onNeedsConfirmation={(email) => {
                setConfirmEmail(email);
                setShowConfirm(true);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
