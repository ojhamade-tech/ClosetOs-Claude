import React from 'react';
import { Clock, Shirt, CalendarCheck, CheckCircle, Sparkles, Plus } from 'lucide-react';

type ActivityEventType = 'added_item' | 'saved_outfit' | 'planned_outfit' | 'marked_worn' | 'generated_outfit' | 'removed_plan';

interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  description: string;
  timestamp: string;
  sessionId?: string;
}

const EVENT_CONFIG: Record<ActivityEventType, { color: string; icon: React.ElementType; label: string }> = {
  added_item:      { color: 'bg-luxury-gold',    icon: Plus,          label: 'Added'   },
  saved_outfit:    { color: 'bg-luxury-charcoal', icon: Shirt,        label: 'Saved'   },
  planned_outfit:  { color: 'bg-luxury-olive',    icon: CalendarCheck, label: 'Planned' },
  marked_worn:     { color: 'bg-luxury-taupe',    icon: CheckCircle,  label: 'Worn'    },
  generated_outfit:{ color: 'bg-luxury-gold',     icon: Sparkles,     label: 'AI'      },
  removed_plan:    { color: 'bg-luxury-stone',    icon: CalendarCheck, label: 'Removed' },
};

const ActivityEventCard: React.FC<{ event: ActivityEvent }> = ({ event }) => {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;

  return (
    <div className="flex space-x-4 py-4 border-b border-luxury-stone/30 last:border-0 group">
      <div className={`w-1.5 shrink-0 rounded-full mt-1 self-stretch ${config.color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between space-x-2">
          <p className="text-sm text-luxury-charcoal leading-tight font-medium">{event.description}</p>
          <Icon size={14} className="text-luxury-taupe shrink-0 mt-0.5" />
        </div>
        <div className="flex items-center space-x-3 mt-1.5">
          <p className="text-[10px] uppercase tracking-widest text-luxury-taupe">{event.timestamp}</p>
          {event.sessionId && (
            <span className="text-[10px] uppercase tracking-widest bg-luxury-ivory border border-luxury-stone/40 px-2 py-0.5 rounded-full text-luxury-taupe">
              {event.sessionId}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface ActivityFeedProps {
  events?: ActivityEvent[];
  maxItems?: number;
}

const SAMPLE_EVENTS: ActivityEvent[] = [
  { id: '1', type: 'added_item',      description: 'Added Cashmere Turtleneck to wardrobe',  timestamp: '2 min ago',    sessionId: 'Session #4' },
  { id: '2', type: 'saved_outfit',    description: 'Saved outfit: Monochrome Evening',         timestamp: '1 hr ago',     sessionId: 'Session #4' },
  { id: '3', type: 'planned_outfit',  description: 'Planned outfit for Art Gallery Opening',   timestamp: 'Yesterday',    sessionId: 'Session #3' },
  { id: '4', type: 'marked_worn',     description: 'Marked Friday outfit as worn',             timestamp: '3 days ago',   sessionId: 'Session #2' },
  { id: '5', type: 'generated_outfit',description: 'AI generated Summer Capsule lookbook',    timestamp: '5 days ago',   sessionId: 'Session #1' },
];

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events = SAMPLE_EVENTS, maxItems = 5 }) => (
  <div className="luxury-card p-8">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-2">
        <Clock size={18} className="text-luxury-taupe" />
        <h4 className="font-serif text-xl text-luxury-charcoal">Recent Activity</h4>
      </div>
      <button className="text-[10px] uppercase tracking-widest font-bold text-luxury-taupe hover:text-luxury-charcoal transition-colors">
        View Detailed History →
      </button>
    </div>
    <div>
      {events.slice(0, maxItems).map(event => (
        <ActivityEventCard key={event.id} event={event} />
      ))}
    </div>
  </div>
);
