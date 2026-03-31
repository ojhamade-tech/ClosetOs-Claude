-- supabase/schema.sql

-- Enable uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. Profiles Table
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Turn on RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger logic for Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

--------------------------------------------------------------------------------
-- 2. Wardrobe Items Table
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wardrobe_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  subcategory text,
  color text,
  brand text,
  season text,
  occasion text,
  style_tags text[], -- Array of strings
  image_url text,
  purchase_date date,
  purchase_price numeric,
  wear_count integer DEFAULT 0,
  favorite boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users control own wardrobe items" 
ON public.wardrobe_items FOR ALL 
USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 3. Outfits Table
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outfits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  occasion text,
  season text,
  weather text,
  mood text,
  formality text,
  explanation text,
  generated_by_ai boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users control own outfits" 
ON public.outfits FOR ALL 
USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 4. Outfit Items Table (Join Table)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outfit_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  outfit_id uuid NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  wardrobe_item_id uuid NOT NULL REFERENCES public.wardrobe_items(id) ON DELETE CASCADE,
  UNIQUE(outfit_id, wardrobe_item_id)
);

ALTER TABLE public.outfit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users control own outfit items" 
ON public.outfit_items FOR ALL 
USING (
  outfit_id IN (SELECT id FROM public.outfits WHERE user_id = auth.uid())
);

--------------------------------------------------------------------------------
-- 5. Weekly Plans Table
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  outfit_id uuid NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  status text DEFAULT 'planned', -- 'planned', 'worn', 'skipped'
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users control own weekly plans" 
ON public.weekly_plans FOR ALL 
USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 6. Outfit Feedback Table
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outfit_feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outfit_id uuid NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  feedback_type text, -- e.g., 'too_hot', 'comfortable', 'wrong_vibe'
  feedback_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.outfit_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users control own outfit feedback" 
ON public.outfit_feedback FOR ALL 
USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 7. Style Preferences Table
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.style_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_colors text[],
  avoided_colors text[],
  favorite_categories text[],
  avoided_categories text[],
  style_identity text,
  occasions text[],
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.style_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users control own style preferences" 
ON public.style_preferences FOR ALL 
USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- Insert a trigger to create an empty style_preferences on profile create
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_profile_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.style_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_profile_prefs();

--------------------------------------------------------------------------------
-- Instructions
--------------------------------------------------------------------------------
-- 1. Create a storage bucket named "wardrobe-images" and make it public.
-- 2. Add an RLS policy on the bucket to allow authenticated users to upload files.
--    Storage Policy -> INSERT: auth.uid() = (storage.foldername(name))[1]
