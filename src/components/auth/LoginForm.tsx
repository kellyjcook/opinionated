import { useState } from 'react';
import { useAuth } from '../../state/authContext';
import { Button } from '../ui/Button';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          className="w-full px-3 py-2.5 border-2 border-[#dadce0] rounded-lg text-base transition-colors focus:border-[#1a73e8] focus:outline-none"
          placeholder="Enter password"
        />
      </div>
      {error && (
        <p className="text-[#c5221f] text-sm">{error}</p>
      )}
      <Button type="submit" disabled={loading} size="lg" className="w-full mt-2">
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
