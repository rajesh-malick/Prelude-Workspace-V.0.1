import { Home, Search, Bell, Settings, Volume2, VolumeX } from 'lucide-react';

const ITEMS = [
  { icon: Home, label: 'Home' },
  { icon: Search, label: 'Search' },
  { icon: Bell, label: 'Notifications' },
  { icon: Settings, label: 'Settings' },
];

const ACTIONS = {
  Home: (p) => p.onHome,
  Search: (p) => p.onOpenSearch,
  Notifications: (p) => p.onOpenNotifications,
  Settings: (p) => p.onOpenSettings,
};

export default function NavDock({
  onHome,
  onOpenSearch,
  onOpenNotifications,
  onOpenSettings,
  soundOn,
  onToggleSound,
  asideForReview,
}) {
  const handlers = { onHome, onOpenSearch, onOpenNotifications, onOpenSettings };
  return (
    <div
      className={`fixed bottom-6 z-[35] transition-all duration-300 ease-out ${
        asideForReview ? 'left-6 translate-x-0' : 'left-1/2 -translate-x-1/2'
      }`}
    >
      <div className="glass-surface flex items-center gap-1 rounded-full px-2 py-2">
        {ITEMS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onClick={ACTIONS[label]?.(handlers)}
            className="flex h-12 w-12 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-white/50 hover:text-stone-900"
          >
            <Icon size={21} strokeWidth={1.75} />
          </button>
        ))}
        <button
          type="button"
          title={soundOn ? 'Mute forest sounds' : 'Unmute forest sounds'}
          aria-label={soundOn ? 'Mute forest sounds' : 'Unmute forest sounds'}
          onClick={onToggleSound}
          className="flex h-12 w-12 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-white/50 hover:text-stone-900"
        >
          {soundOn ? <Volume2 size={21} strokeWidth={1.75} /> : <VolumeX size={21} strokeWidth={1.75} />}
        </button>
      </div>
    </div>
  );
}
