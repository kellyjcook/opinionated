import { useState } from 'react';
import { useAuth } from '../../state/authContext';
import { Button } from '../ui/Button';

interface RegisterFormProps {
  onNeedsConfirmation: (email: string) => void;
}

export function RegisterForm({ onNeedsConfirmation }: RegisterFormProps) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await register(email, password, displayName);
    if (result.error) {
      setError(result.error);
    } else if (result.needsConfirmation) {
      onNeedsConfirmation(email);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-[#202124] mb-1">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={25}
          className="w-full px-3 py-2.5 border-2 border-[#dadce0] rounded-lg text-base transition-colors focus:border-[#1a73e8] focus:outline-none"
          placeholder="Your name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#202124] mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 border-2 border-[#dadce0] rounded-lg text-base transition-colors focus:border-[#1a73e8] focus:outline-none"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#202124] mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-3 py-2.5 border-2 border-[#dadce0] rounded-lg text-base transition-colors focus:border-[#1a73e8] focus:outline-none"
          placeholder="At least 6 characters"
        />
      </div>
      {error && (
        <p className="text-[#c5221f] text-sm">{error}</p>
      )}
      <Button type="submit" disabled={loading} size="lg" className="w-full mt-2">
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
  );
}
