export const TAXONOMY: Record<string, string[]> = {
  'Tops': ['T-Shirt', 'Shirt', 'Blouse', 'Polo', 'Sweater', 'Hoodie', 'Knitwear'],
  'Bottoms': ['Jeans', 'Trousers', 'Shorts', 'Skirt'],
  'Outerwear': ['Jacket', 'Coat', 'Blazer'],
  'Footwear': ['Sneakers', 'Shoes', 'Boots', 'Slippers', 'Heels'],
  'Accessories': ['Belt', 'Bag', 'Watch', 'Scarf', 'Hat', 'Jewelry'],
  'Other': []
};

export const CATEGORIES = Object.keys(TAXONOMY);

/**
 * Normalizes legacy or non-standard category strings from the database 
 * into the strict TAXONOMY categories.
 */
export function mapLegacyCategory(rawCategory: string | null | undefined): string {
  if (!rawCategory) return 'Other';
  
  const c = rawCategory.trim();
  
  // Direct match
  if (CATEGORIES.includes(c)) return c;
  
  // Legacy mappings
  const lowerC = c.toLowerCase();
  if (lowerC.includes('denim')) return 'Bottoms';
  if (lowerC.includes('knitwear')) return 'Tops';
  if (lowerC.includes('silk & cashmere')) return 'Other';
  if (lowerC.includes('footwear') || lowerC.includes('shoes')) return 'Footwear';
  if (lowerC.includes('accessories') || lowerC.includes('access')) return 'Accessories';
  if (lowerC.includes('outerwear')) return 'Outerwear';
  
  // Default fallback if we don't know where it goes to avoid breaking
  return 'Other';
}
