import React from 'react';

interface ColorSwatchProps {
  color: string;
  hex: string;
  count: number;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, hex, count }) => (
  <div className="flex flex-col items-center space-y-2">
    <div
      className="w-12 h-16 rounded-2xl shadow-sm border border-luxury-stone/20"
      style={{ backgroundColor: hex }}
    />
    <span className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">{color}</span>
    <span className="text-xs font-semibold text-luxury-charcoal">{count} items</span>
  </div>
);

interface CategoryBarProps {
  label: string;
  percent: number;
}

const CategoryBar: React.FC<CategoryBarProps> = ({ label, percent }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <span className="text-xs font-semibold text-luxury-charcoal uppercase tracking-wider">{label}</span>
      <span className="text-xs font-bold text-luxury-taupe">{percent}%</span>
    </div>
    <div className="w-full h-1.5 bg-luxury-stone/40 rounded-full overflow-hidden">
      <div
        className="h-full bg-luxury-charcoal rounded-full transition-all duration-700"
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);

interface DormantItemProps {
  name: string;
  daysAgo: number;
  imageUrl?: string;
}

const DormantItem: React.FC<DormantItemProps> = ({ name, daysAgo, imageUrl }) => (
  <div className="luxury-card overflow-hidden group flex-1 min-w-0">
    <div className="relative aspect-[3/4] bg-luxury-stone/20 overflow-hidden">
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-luxury-stone text-4xl font-serif">✦</span>
        </div>
      )}
      <span className="absolute top-3 left-3 bg-luxury-charcoal/80 text-white text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full">
        Dormant
      </span>
    </div>
    <div className="p-4">
      <p className="text-sm font-semibold text-luxury-charcoal truncate">{name}</p>
      <p className="text-[10px] text-luxury-taupe uppercase tracking-widest mt-1">Last worn {daysAgo} days ago</p>
    </div>
  </div>
);

export interface ColorDNAItem { color: string; hex: string; count: number; }
export interface CategoryItem { label: string; percent: number; }
export interface DormantCollectionItem { name: string; daysAgo: number; imageUrl?: string; }

interface StyleDNAProps {
  colors?: ColorDNAItem[];
  categories?: CategoryItem[];
  dormantItems?: DormantCollectionItem[];
}

const DEFAULT_COLORS: ColorDNAItem[] = [
  { color: 'Navy', hex: '#1B2A4A', count: 14 },
  { color: 'Ivory', hex: '#F5F0E8', count: 11 },
  { color: 'Camel', hex: '#C19A6B', count: 8 },
  { color: 'Charcoal', hex: '#3D3D3D', count: 9 },
  { color: 'Olive', hex: '#5A5A40', count: 6 },
];

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { label: 'Tailoring', percent: 32 },
  { label: 'Knitwear', percent: 24 },
  { label: 'Outerwear', percent: 20 },
  { label: 'Denim', percent: 14 },
];

const DEFAULT_DORMANT: DormantCollectionItem[] = [
  { name: 'Double-Breasted Overcoat', daysAgo: 72 },
  { name: 'Chelsea Boots Nero', daysAgo: 65 },
  { name: 'Structured Poplin Shirt', daysAgo: 61 },
];

export const StyleDNA: React.FC<StyleDNAProps> = ({
  colors = DEFAULT_COLORS,
  categories = DEFAULT_CATEGORIES,
  dormantItems = DEFAULT_DORMANT,
}) => (
  <div className="space-y-8">
    {/* Color DNA */}
    <div className="luxury-card p-8">
      <h4 className="font-serif text-xl text-luxury-charcoal mb-6">Color Distribution</h4>
      <div className="flex items-start space-x-6">
        {colors.map((c, i) => (
          <ColorSwatch key={i} {...c} />
        ))}
      </div>
    </div>

    {/* Category Breakdown */}
    <div className="luxury-card p-8">
      <h4 className="font-serif text-xl text-luxury-charcoal mb-6">Category Breakdown</h4>
      <div className="space-y-5">
        {categories.map((cat, i) => (
          <CategoryBar key={i} {...cat} />
        ))}
      </div>
    </div>

    {/* Dormant Collection */}
    <div className="luxury-card p-8">
      <h4 className="font-serif text-xl text-luxury-charcoal mb-6">Dormant Items</h4>
      <div className="flex space-x-4">
        {dormantItems.map((item, i) => (
          <DormantItem key={i} {...item} />
        ))}
      </div>
    </div>
  </div>
);
