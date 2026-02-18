-- Migration 1: Profiles & Auth (replicating WaitingGameApp pattern)
-- ================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  location TEXT,
  is_unlocked BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_player_count INT DEFAULT 3,
  player_names JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  error_source TEXT,
  error_message TEXT,
  error_context JSONB,
  severity TEXT DEFAULT 'error',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile + preferences on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.email);
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS for user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own prefs" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own prefs" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- RLS for error_logs
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert errors" ON public.error_logs FOR INSERT WITH CHECK (true);


-- Migration 2: Scenarios
-- ======================

CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read scenarios" ON public.scenarios FOR SELECT USING (true);


-- Migration 3: Game Tables
-- ========================

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'finished')),
  player_count INT NOT NULL CHECK (player_count BETWEEN 3 AND 8),
  current_round INT NOT NULL DEFAULT 0,
  active_player_index INT NOT NULL DEFAULT 0,
  winner_player_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  seat_order INT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  cubes_placed INT NOT NULL DEFAULT 0 CHECK (cubes_placed BETWEEN 0 AND 4),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  active_player_id UUID NOT NULL REFERENCES public.players(id),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id),
  chosen_number INT NOT NULL CHECK (chosen_number BETWEEN 1 AND 10),
  status TEXT NOT NULL DEFAULT 'rating' CHECK (status IN ('rating', 'guessing', 'scoring', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.guesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id UUID NOT NULL REFERENCES public.turns(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id),
  lift_time_ms NUMERIC NOT NULL,
  target_time_ms NUMERIC NOT NULL,
  delta_ms NUMERIC NOT NULL,
  abs_delta_ms NUMERIC NOT NULL,
  points_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for game tables
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own games" ON public.games FOR ALL USING (auth.uid() = host_user_id);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage players in own games" ON public.players FOR ALL
  USING (game_id IN (SELECT id FROM public.games WHERE host_user_id = auth.uid()));

ALTER TABLE public.turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage turns in own games" ON public.turns FOR ALL
  USING (game_id IN (SELECT id FROM public.games WHERE host_user_id = auth.uid()));

ALTER TABLE public.guesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage guesses in own games" ON public.guesses FOR ALL
  USING (turn_id IN (SELECT id FROM public.turns WHERE game_id IN (SELECT id FROM public.games WHERE host_user_id = auth.uid())));

-- Indexes
CREATE INDEX idx_players_game_id ON public.players(game_id);
CREATE INDEX idx_turns_game_id ON public.turns(game_id);
CREATE INDEX idx_guesses_turn_id ON public.guesses(turn_id);


-- Migration 4: Seed Scenarios
-- ===========================

INSERT INTO public.scenarios (text, category) VALUES
  ('Pineapple on pizza', 'food'),
  ('Monday mornings', 'lifestyle'),
  ('Getting caught in the rain', 'experiences'),
  ('Reality TV shows', 'entertainment'),
  ('Sleeping with socks on', 'lifestyle'),
  ('Cold showers', 'lifestyle'),
  ('Public speaking', 'experiences'),
  ('Parallel parking', 'skills'),
  ('Rollercoasters', 'experiences'),
  ('Eating cereal for dinner', 'food'),
  ('Working from home', 'lifestyle'),
  ('Small talk with strangers', 'social'),
  ('Camping in a tent', 'experiences'),
  ('Karaoke night', 'entertainment'),
  ('Being the designated driver', 'social'),
  ('Waking up early on weekends', 'lifestyle'),
  ('Spicy food', 'food'),
  ('Long car rides', 'experiences'),
  ('Group photos', 'social'),
  ('Doing laundry', 'lifestyle'),
  ('Going to the dentist', 'experiences'),
  ('Surprise parties', 'social'),
  ('Black licorice', 'food'),
  ('Airport layovers', 'experiences'),
  ('Assembling IKEA furniture', 'lifestyle'),
  ('Hot yoga', 'fitness'),
  ('Board game nights', 'entertainment'),
  ('Running in the morning', 'fitness'),
  ('Blind dates', 'social'),
  ('Instant ramen', 'food'),
  ('Traffic jams', 'experiences'),
  ('Thunderstorms', 'nature'),
  ('Pop music', 'entertainment'),
  ('Sushi', 'food'),
  ('Winter holidays', 'seasonal'),
  ('Early flights', 'experiences'),
  ('Movie sequels', 'entertainment'),
  ('Buffets', 'food'),
  ('Team building exercises', 'work'),
  ('Social media', 'lifestyle');
