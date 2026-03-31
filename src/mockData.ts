import { WardrobeItem, Outfit, PlannerEvent, ActivityItem, UserProfile } from './types';

export const MOCK_ITEMS: WardrobeItem[] = [
  {
    id: '1',
    name: 'Tailored Wool Blazer',
    brand: 'The Row',
    category: 'Outerwear',
    price: 2450,
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800',
    tags: ['Tailoring', 'Wool', 'Charcoal'],
    costPerWear: 45.30,
    isFavorite: true,
  },
  {
    id: '2',
    name: 'Silk Crepe de Chine Blouse',
    brand: 'Khaite',
    category: 'Silk & Cashmere',
    price: 890,
    imageUrl: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&q=80&w=800',
    tags: ['Silk', 'Ivory', 'Essential'],
    costPerWear: 12.50,
    isFavorite: false,
  },
  {
    id: '3',
    name: 'Straight-Leg Indigo Denim',
    brand: 'Toteme',
    category: 'Denim',
    price: 320,
    imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=800',
    tags: ['Denim', 'Indigo', 'Structured'],
    costPerWear: 4.20,
    isFavorite: true,
  },
  {
    id: '4',
    name: 'Cashmere Turtleneck Knit',
    brand: 'Loro Piana',
    category: 'Silk & Cashmere',
    price: 1650,
    imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800',
    tags: ['Cashmere', 'Beige', 'Winter'],
    costPerWear: 82.50,
    isFavorite: false,
  },
  {
    id: '5',
    name: 'Leather Loafers',
    brand: 'Gucci',
    category: 'Footwear',
    price: 920,
    imageUrl: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&q=80&w=800',
    tags: ['Leather', 'Black', 'Classic'],
    costPerWear: 15.80,
    isFavorite: true,
  },
  {
    id: '6',
    name: 'Structured Leather Tote',
    brand: 'Saint Laurent',
    category: 'Accessories',
    price: 2850,
    imageUrl: 'https://images.unsplash.com/photo-1584917033904-493bb3c3cc0a?auto=format&fit=crop&q=80&w=800',
    tags: ['Leather', 'Tan', 'Work'],
    costPerWear: 120.00,
    isFavorite: false,
  },
];

export const MOCK_OUTFITS: Outfit[] = [
  {
    id: 'o1',
    name: 'The Gallery Opening',
    items: [MOCK_ITEMS[0], MOCK_ITEMS[1], MOCK_ITEMS[2], MOCK_ITEMS[4]],
    occasion: 'Evening Event',
    vibe: 'Sophisticated & Architectural',
    imageUrl: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&q=80&w=800',
    description: 'A balanced ensemble combining structured tailoring with soft silk textures, perfect for a creative evening.',
  },
  {
    id: 'o2',
    name: 'Executive Lunch',
    items: [MOCK_ITEMS[0], MOCK_ITEMS[3], MOCK_ITEMS[5]],
    occasion: 'Business',
    vibe: 'Quiet Luxury',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800',
    description: 'Understated elegance for professional settings where presence is felt through quality rather than noise.',
  }
];

export const MOCK_EVENTS: PlannerEvent[] = [
  {
    id: 'e1',
    date: '2026-03-30',
    title: 'Board Meeting',
    location: 'The Shard, London',
    outfitId: 'o2',
    time: '10:00 AM',
  },
  {
    id: 'e2',
    date: '2026-04-02',
    title: 'Gallery Opening',
    location: 'White Cube',
    outfitId: 'o1',
    time: '7:00 PM',
  }
];

export const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: 'a1',
    type: 'added',
    message: 'New piece added to your collection',
    itemName: 'Tailored Wool Blazer',
    timestamp: '2 hours ago',
  },
  {
    id: 'a2',
    type: 'planned',
    message: 'Outfit planned for Gallery Opening',
    timestamp: '5 hours ago',
  },
  {
    id: 'a3',
    type: 'insight',
    message: 'Style Insight: Your cost-per-wear for Denim has decreased by 12%',
    timestamp: 'Yesterday',
  }
];

export const MOCK_USER: UserProfile = {
  name: 'Julian',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400',
  membership: 'Private Atelier Member',
  location: 'London, UK',
  joinDate: 'September 2024',
  styleDNA: ['Architectural', 'Minimalist', 'Monochromatic', 'High-Texture'],
};
