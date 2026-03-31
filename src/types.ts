export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WardrobeItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  subcategory: string | null;
  color: string | null;
  brand: string | null;
  season: string | null;
  occasion: string | null;
  style_tags: string[] | null;
  image_url: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  wear_count: number;
  favorite: boolean;
  availability?: 'available' | 'unavailable' | 'needs_washing';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Outfit {
  id: string;
  user_id: string;
  name: string | null;
  occasion: string | null;
  season: string | null;
  weather: string | null;
  mood: string | null;
  formality: string | null;
  explanation: string | null;
  generated_by_ai: boolean;
  created_at: string;
  updated_at: string;
  items?: WardrobeItem[]; // Client-side mapped
}

export interface WeeklyPlan {
  id: string;
  user_id: string;
  date: string;
  outfit_id: string;
  status: 'planned' | 'worn' | 'skipped';
  notes: string | null;
  created_at: string;
  updated_at: string;
  outfits?: Outfit; // Client-side mapped
}

export interface StylePreferences {
  id: string;
  user_id: string;
  preferred_colors: string[] | null;
  avoided_colors: string[] | null;
  favorite_categories: string[] | null;
  avoided_categories: string[] | null;
  style_identity: string | null;
  occasions: string[] | null;
  updated_at: string;
}

export interface ActivityItem {
  id: string;
  type: 'added' | 'planned' | 'worn' | 'insight';
  message: string;
  timestamp: string;
  itemName?: string;
}
