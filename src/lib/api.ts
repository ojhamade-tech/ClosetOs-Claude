import { supabase } from './supabase';
import { WardrobeItem, Outfit, WeeklyPlan, Profile, StylePreferences } from '../types';

export type ActivityEventType =
  | 'added_item'
  | 'saved_outfit'
  | 'planned_outfit'
  | 'removed_plan'
  | 'marked_worn'
  | 'generated_outfit';

export interface ActivityLogEntry {
  event_id: string;       // Primary key — matches SQL `event_id uuid primary key`
  user_id: string;
  type: ActivityEventType;
  item_id: string | null;
  outfit_id: string | null;
  plan_date: string | null;
  source: string | null;
  metadata: Record<string, any>;
  session_id: string | null;
  event_timestamp: string;
  created_at: string;
}

// Helper to get authenticated user id and throw if not authenticated
async function getAuthUser(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Authentication error: ${error.message}`);
  if (!data?.session?.user?.id) throw new Error("No authenticated session found.");
  return data.session.user.id;
}

// Session helper for funnels and behavior chains
function getSessionId(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30-minute inactivity window.
  // Note: sessions are analytical constructs, not truths.
  // A long session (e.g. 2 hrs of outfit planning) will be split at the 30-min idle boundary.
  // A return after 25 min remains the same session. Adjust timeout to match real user behavior if analytics
  // show sessions are being fragmented or inflated. This is a tunable heuristic, not a hard rule.
  const now = Date.now();
  
  let sid = localStorage.getItem('closet_os_session');
  const lastActiveStr = localStorage.getItem('closet_os_session_ts');
  const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;
  
  if (!sid || now - lastActive > SESSION_TIMEOUT_MS) {
    sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem('closet_os_session', sid);
  }
  
  localStorage.setItem('closet_os_session_ts', now.toString());
  return sid;
}

// Activity Logging
export async function logActivity(
  userId: string,
  type: 'added_item' | 'saved_outfit' | 'planned_outfit' | 'removed_plan' | 'marked_worn' | 'generated_outfit',
  params?: {
    eventId?: string | null,
    itemId?: string | null,
    outfitId?: string | null,
    planDate?: string | null,
    source?: string | null,
    metadata?: Record<string, any> | null
  }
) {
  try {
    const payload = {
      event_id: params?.eventId ?? (crypto.randomUUID ? crypto.randomUUID() : null),
      user_id: userId,
      type,
      item_id: params?.itemId ?? null,
      outfit_id: params?.outfitId ?? null,
      plan_date: params?.planDate ?? null,
      source: params?.source ?? 'manual',
      metadata: params?.metadata ?? {},
      session_id: getSessionId(),
      event_timestamp: new Date().toISOString()
    };
    
    // We do not throw or 'single()' on failure to keep user flows safe
    const { error } = await supabase.from('activity_log').insert([payload]);
    if (error) throw error;
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}

// Profile
export async function getProfile(userId: string): Promise<Profile | null> {
  const authUserId = await getAuthUser();
  if (authUserId !== userId) throw new Error("Unauthorized profile access attempt.");
  
  const { data, error } = await supabase.from('profiles').select('*').eq('id', authUserId).single();
  // Safe handling of missing rows
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }
  return data || null;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const authUserId = await getAuthUser();
  if (authUserId !== userId) throw new Error("Unauthorized profile update attempt.");

  const { data, error } = await supabase.from('profiles').upsert({ id: authUserId, ...updates }, { onConflict: 'id' }).select().single();
  if (error) throw new Error(`Failed to update profile: ${error.message}`);
  return data;
}

// Wardrobe Items
export async function getWardrobeItems(): Promise<WardrobeItem[]> {
  const authUserId = await getAuthUser();
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('user_id', authUserId)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(`Failed to fetch wardrobe items: ${error.message}`);
  return data || [];
}

export async function getWardrobeItem(id: string): Promise<WardrobeItem | null> {
  const authUserId = await getAuthUser();
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', authUserId)
    .single();
    
  if (error) throw new Error(`Failed to fetch wardrobe item: ${error.message}`);
  return data;
}

export async function getOtherWardrobeItems(): Promise<Partial<WardrobeItem>[]> {
  const authUserId = await getAuthUser();
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('id, name, category, subcategory, color, brand, notes, image_url')
    .eq('user_id', authUserId)
    .eq('category', 'Other')
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(`Failed to fetch Other wardrobe items: ${error.message}`);
  return data || [];
}

export async function updateOtherWardrobeItemCategory(id: string, category: string): Promise<void> {
  const authUserId = await getAuthUser();
  const { error } = await supabase
    .from('wardrobe_items')
    .update({ category })
    .eq('id', id)
    .eq('user_id', authUserId);
    
  if (error) throw new Error(`Failed to update wardrobe item category: ${error.message}`);
}

export async function createWardrobeItem(item: Partial<WardrobeItem>): Promise<WardrobeItem> {
  const authUserId = await getAuthUser();
  const { data, error } = await supabase
    .from('wardrobe_items')
    .insert([{ ...item, user_id: authUserId }])
    .select()
    .single();
    
  if (error) throw new Error(`Failed to create wardrobe item: ${error.message}`);
  
  logActivity(authUserId, 'added_item', { 
    itemId: data.id,
    metadata: { category: item.category ?? null }
  });
  return data;
}

export async function updateWardrobeItem(id: string, updates: Partial<WardrobeItem>): Promise<WardrobeItem> {
  const authUserId = await getAuthUser();
  const { data, error } = await supabase
    .from('wardrobe_items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', authUserId)
    .select()
    .single();
    
  if (error) throw new Error(`Failed to update wardrobe item: ${error.message}`);
  return data;
}

export async function deleteWardrobeItem(id: string): Promise<void> {
  const authUserId = await getAuthUser();
  // Document Assumptions: Any associated images inside `wardrobe-images` are NOT automatically deleted, 
  // only the DB row is removed. Storage cleanup needs to happen manually or via database triggers.
  const { error } = await supabase
    .from('wardrobe_items')
    .delete()
    .eq('id', id)
    .eq('user_id', authUserId);
    
  if (error) throw new Error(`Failed to delete wardrobe item: ${error.message}`);
}

export async function getFavoriteItems(): Promise<WardrobeItem[]> {
  const authUserId = await getAuthUser();
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('user_id', authUserId)
    .eq('favorite', true)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(`Failed to fetch favorite items: ${error.message}`);
  return data || [];
}

// Outfits
export async function getOutfits(): Promise<Outfit[]> {
  const authUserId = await getAuthUser();
  const { data, error } = await supabase
    .from('outfits')
    .select('*')
    .eq('user_id', authUserId)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(`Failed to fetch outfits: ${error.message}`);
  if (!data) return [];
  
  // Fetch linked items for each outfit using outfit_items map.
  // Assuming outfit_id mapping aligns tightly with user's scoped outfits.
  const outfitsWithItems = await Promise.all(data.map(async (outfit) => {
    const { data: linkData, error: linkError } = await supabase
      .from('outfit_items')
      .select('wardrobe_item_id, wardrobe_items(*)')
      .eq('outfit_id', outfit.id);
      
    if (linkError) throw new Error(`Failed to fetch outfit items: ${linkError.message}`);
      
    const items = linkData?.map((link: any) => link.wardrobe_items) || [];
    return { ...outfit, items };
  }));
  
  return outfitsWithItems;
}

export async function createOutfit(outfitParams: Partial<Outfit>, itemIds: string[], source = 'manual'): Promise<Outfit> {
  const authUserId = await getAuthUser();
  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .insert([{ ...outfitParams, user_id: authUserId }])
    .select()
    .single();

  if (outfitError) throw new Error(`Failed to create outfit: ${outfitError.message}`);

  if (itemIds.length > 0) {
    const itemLinks = itemIds.map(id => ({
      outfit_id: outfit.id,
      wardrobe_item_id: id
    }));
    const { error: linkError } = await supabase.from('outfit_items').insert(itemLinks);
    if (linkError) throw new Error(`Failed to link outfit items: ${linkError.message}`);
  }

  logActivity(authUserId, 'saved_outfit', {
    outfitId: outfit.id,
    source,
    metadata: { itemCount: itemIds.length, itemIds }
  });

  return outfit;
}

// Planner
export async function getWeeklyPlans(startDate: string, endDate: string): Promise<WeeklyPlan[]> {
  const authUserId = await getAuthUser();
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*, outfits(*, outfit_items(wardrobe_items(*)))')
    .eq('user_id', authUserId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
    
  if (error) throw new Error(`Failed to fetch weekly plans: ${error.message}`);
  
  if (!data) return [];
  
  return data.map((plan: any) => {
    let newOutfits = plan.outfits;
    if (plan.outfits && plan.outfits.outfit_items) {
      const { outfit_items, ...restOutfits } = plan.outfits;
      newOutfits = {
        ...restOutfits,
        items: outfit_items.map((oi: any) => oi.wardrobe_items)
      };
    }
    return { ...plan, outfits: newOutfits };
  });
}

export async function setPlannerOutfit(date: string, outfitId: string, status = 'planned'): Promise<WeeklyPlan> {
  const authUserId = await getAuthUser();
  
  const payload = {
    user_id: authUserId,
    date,
    outfit_id: outfitId,
    status
  };
  
  const { data, error } = await supabase
    .from('weekly_plans')
    .upsert(payload, { onConflict: 'user_id, date' })
    .select()
    .single();
    
  if (error) throw new Error(`Failed to set planner outfit: ${error.message}`);

  const eventType = status === 'worn' ? 'marked_worn' : 'planned_outfit';
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();

  // Optional improvement: for marked_worn events, capture itemIds at the moment of wear.
  // This avoids relying solely on relational joins for event-level item history.
  // Safe: failure only skips itemIds in metadata — it never blocks the planner action.
  let wornItemIds: string[] = [];
  if (status === 'worn') {
    try {
      const { data: outfitItems } = await supabase
        .from('outfit_items')
        .select('wardrobe_item_id')
        .eq('outfit_id', outfitId);
      wornItemIds = (outfitItems ?? []).map((r: any) => r.wardrobe_item_id).filter(Boolean);
    } catch {
      // Non-blocking — log proceeds without itemIds
    }
  }

  logActivity(authUserId, eventType, {
    outfitId,
    planDate: date,
    metadata: {
      status,
      changeType: 'create_or_update',
      weekday,
      ...(status === 'worn' && wornItemIds.length > 0 ? { itemIds: wornItemIds } : {}),
    }
  });

  return data;
}

export async function deletePlannerOutfit(date: string): Promise<void> {
  const authUserId = await getAuthUser();
  const { error } = await supabase
    .from('weekly_plans')
    .delete()
    .eq('date', date)
    .eq('user_id', authUserId);
    
  if (error) throw new Error(`Failed to delete planner outfit: ${error.message}`);
  
  logActivity(authUserId, 'removed_plan', { 
    planDate: date,
    metadata: { changeType: 'delete' }
  });
}

// Activity Log Retrieval
export async function getActivityLog(params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<ActivityLogEntry[]> {
  const authUserId = await getAuthUser();

  let query = supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', authUserId)
    .order('event_timestamp', { ascending: false });

  if (params?.startDate) query = query.gte('event_timestamp', params.startDate);
  if (params?.endDate)   query = query.lte('event_timestamp', params.endDate);
  if (params?.limit)     query = query.limit(params.limit);

  const { data, error } = await query;

  if (error) {
    // Soft-fail cases where the migration simply hasn't been run yet.
    // Known limitation: string-matching on error.message is fragile — Postgres error codes
    // are more reliable. We catch both PGRST116 (no rows via .single()) and 42P01
    // (undefined_table, the real pre-migration error). Any other error is a genuine fault.
    const isMigrationMissing =
      error.code === 'PGRST116'  ||  // no rows (single() edge case)
      error.code === '42P01'     ||  // PostgreSQL: undefined_table
      error.message?.includes('does not exist');

    if (isMigrationMissing) return [];
    throw new Error(`Failed to fetch activity log: ${error.message}`);
  }

  return (data ?? []) as ActivityLogEntry[];
}


// Storage Helpers
export async function uploadWardrobeImage(file: File, userId: string): Promise<string> {
  const authUserId = await getAuthUser();
  if (authUserId !== userId) throw new Error("Unauthorized storage upload attempt.");

  const fileExt = file.name.split('.').pop();
  const fileName = `${authUserId}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('wardrobe-images')
    .upload(fileName, file);
    
  if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);
  
  const { data } = supabase.storage.from('wardrobe-images').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function uploadAvatarImage(file: File, userId: string): Promise<string> {
  const authUserId = await getAuthUser();
  if (authUserId !== userId) throw new Error("Unauthorized storage upload attempt.");

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${authUserId}/avatar.${fileExt}`;
  
  // Note: if a user uploads a new image with a different extension (e.g. .png vs .jpg),
  // upsert will NOT overwrite the prior extension's file. The older file is orphaned 
  // and will require manual storage cleanup or a DB trigger.
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true }); // Upsert safe for strictly identical extensions
    
  if (uploadError) throw new Error(`Failed to upload avatar: ${uploadError.message}`);
  
  // To bypass browser cache on deterministic URLs, we can append a timestamp 
  // but since we want clean DB URLs, we save the base URL. The client handles cache-busting visually if needed.
  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function deleteWardrobeImage(imageUrl: string): Promise<void> {
  const authUserId = await getAuthUser(); 

  try {
    const url = new URL(imageUrl);
    const pathSegments = url.pathname.split('/wardrobe-images/');
    
    if (pathSegments.length !== 2) {
      throw new Error(`Invalid Supabase storage URL format: ${url.pathname}`);
    }
    
    // filePath contains the "authUserId/filename.ext" relative path within the bucket
    const filePath = pathSegments[1];
    
    // Safety check: ensure the path begins with the authenticated user ID before issuing deletion
    if (!filePath.startsWith(`${authUserId}/`)) {
       throw new Error(`Unauthorized image deletion attempt for a file not owned by the session user.`);
    }
    
    const { error } = await supabase.storage.from('wardrobe-images').remove([filePath]);
    if (error) throw new Error(`Failed to delete image from storage: ${error.message}`);
  } catch (err: any) {
    throw new Error(`Error during image deletion extraction: ${err.message}`);
  }
}

// Style Preferences
export async function getStylePreferences(userId: string): Promise<StylePreferences | null> {
  const authUserId = await getAuthUser();
  if (authUserId !== userId) throw new Error("Unauthorized style preference access attempt.");

  const { data, error } = await supabase
    .from('style_preferences')
    .select('*')
    .eq('user_id', authUserId)
    .single();
    
  // PGRST116 means zero rows returned from a single() query. This is normal if empty.
  if (error && error.code !== 'PGRST116') { 
    throw new Error(`Failed to fetch preferences: ${error.message}`);
  }
  return data;
}

export async function updateStylePreferences(userId: string, updates: Partial<StylePreferences>): Promise<StylePreferences> {
  const authUserId = await getAuthUser();
  if (authUserId !== userId) throw new Error("Unauthorized style preference update attempt.");

  // Analytics-readiness: clean arrays to prevent duplicates, empty strings, and whitespace variations
  const cleanArray = (arr: string[] | null | undefined) => {
    if (!arr) return arr;
    const clean = arr.map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const uniqueMap = new Map<string, string>();
    clean.forEach(item => {
      const lower = item.toLowerCase();
      if (!uniqueMap.has(lower)) {
        uniqueMap.set(lower, item); // preserve original case of first occurrence
      }
    });
    return Array.from(uniqueMap.values());
  };

  const payload: any = {
    user_id: authUserId,
    ...updates,
  };

  if ('favorite_categories' in updates) payload.favorite_categories = cleanArray(updates.favorite_categories);
  if ('avoided_categories' in updates) payload.avoided_categories = cleanArray(updates.avoided_categories);
  if ('preferred_colors' in updates) payload.preferred_colors = cleanArray(updates.preferred_colors);
  if ('avoided_colors' in updates) payload.avoided_colors = cleanArray(updates.avoided_colors);
  if ('occasions' in updates) payload.occasions = cleanArray(updates.occasions);
  if ('style_identity' in updates) payload.style_identity = updates.style_identity ? updates.style_identity.trim() : null;

  const { data, error } = await supabase.from('style_preferences')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();
    
  if (error) throw new Error(`Failed to update preferences: ${error.message}`);
  return data;
}
