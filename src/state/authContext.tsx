import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/errors';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  location: string | null;
  is_unlocked: boolean;
  is_admin: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logError('authContext:loadProfile', error.message, { userId });
        return;
      }

      setProfile({
        id: data.id,
        email: data.email ?? '',
        display_name: data.display_name,
        location: data.location,
        is_unlocked: data.is_unlocked ?? false,
        is_admin: data.is_admin ?? false,
      });
    } catch (err) {
      logError('authContext:loadProfile', (err as Error).message, { userId });
    }
  }, []);

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        logError('authContext:login', error.message, { email });
        return { error: error.message };
      }
      return {};
    } catch (err) {
      const msg = (err as Error).message;
      logError('authContext:login', msg);
      return { error: msg };
    }
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    displayName: string
  ): Promise<{ error?: string; needsConfirmation?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });

      if (error) {
        logError('authContext:register', error.message, { email });
        return { error: error.message };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return { needsConfirmation: true };
      }

      return {};
    } catch (err) {
      const msg = (err as Error).message;
      logError('authContext:register', msg);
      return { error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
