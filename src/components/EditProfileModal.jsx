import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import Avatar from './Avatar';

const COLOR_OPTIONS = ['#4E9A5C', '#C98A2E', '#3E7FB0', '#8B6FB0', '#C9638A', '#3E9A9A'];
const MAX_AVATAR_BYTES = 900_000;

const WEATHER_OPTIONS = [
  { value: 'clear', label: 'Clear' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'rain', label: 'Rain' },
  { value: 'snow', label: 'Snow' },
  { value: 'haze', label: 'Golden haze' },
];

export default function EditProfileModal({
  name: initialName,
  bio: initialBio,
  avatarUrl: initialAvatarUrl,
  villageColor: initialVillageColor,
  weatherMode: initialWeatherMode,
  weatherCity: initialWeatherCity,
  onSave,
  onClose,
}) {
  const [name, setName] = useState(initialName ?? '');
  const [bio, setBio] = useState(initialBio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? null);
  const [villageColor, setVillageColor] = useState(initialVillageColor ?? null);
  const [weatherMode, setWeatherMode] = useState(initialWeatherMode ?? 'clear');
  const [weatherCity, setWeatherCity] = useState(initialWeatherCity ?? '');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result.length > MAX_AVATAR_BYTES) {
        setError('That image is too large — try a smaller photo.');
        return;
      }
      setError('');
      setAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    if (weatherMode === 'auto' && !weatherCity.trim()) {
      setError('Add a city for automatic weather, or pick a fixed one instead.');
      return;
    }
    onSave({
      name: name.trim(),
      bio: bio.trim(),
      avatarUrl,
      villageColor,
      weatherMode,
      weatherCity: weatherCity.trim(),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/15 p-6"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="glass-surface max-h-[85vh] w-[380px] overflow-y-auto rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-stone-800">Edit profile</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-black/5 hover:text-stone-700"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Avatar name={name || '?'} avatarUrl={avatarUrl} size={56} />
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 text-[12.5px] font-medium text-stone-700 transition-colors hover:bg-black/10"
            >
              <Upload size={13} strokeWidth={2} /> {avatarUrl ? 'Change photo' : 'Upload photo'}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="ml-2 text-[12.5px] font-medium text-stone-500 hover:text-stone-700"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <label className="mt-4 block text-[11.5px] font-medium text-stone-600">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg bg-black/5 px-3 py-2 text-[13px] text-stone-800 outline-none placeholder:text-stone-500 focus:bg-black/[0.07]"
        />

        <label className="mt-3 block text-[11.5px] font-medium text-stone-600">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 280))}
          placeholder="A line about what you work on"
          rows={2}
          className="mt-1 w-full resize-none rounded-lg bg-black/5 px-3 py-2 text-[13px] text-stone-800 outline-none placeholder:text-stone-500 focus:bg-black/[0.07]"
        />
        <div className="mt-0.5 text-right text-[10.5px] text-stone-400">{bio.length}/280</div>

        <label className="mt-1 block text-[11.5px] font-medium text-stone-600">Village tree color</label>
        <p className="mt-0.5 text-[11px] text-stone-500">How your tree looks in the Village overview. Leave unset to use your default color.</p>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVillageColor(null)}
            title="Use default"
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-medium text-stone-500 transition-transform ${
              villageColor ? 'border-transparent' : 'border-stone-400'
            }`}
          >
            auto
          </button>
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setVillageColor(c)}
              className="h-7 w-7 flex-none rounded-full transition-transform"
              style={{
                backgroundColor: c,
                transform: villageColor === c ? 'scale(1.15)' : 'scale(1)',
                boxShadow: villageColor === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : 'none',
              }}
            />
          ))}
        </div>

        <label className="mt-3 block text-[11.5px] font-medium text-stone-600">Grove weather</label>
        <p className="mt-0.5 text-[11px] text-stone-500">
          Layers onto the sky's usual day/night lighting — pick a fixed mood, or let it auto-track a real city.
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1 rounded-lg bg-black/5 p-1">
          {WEATHER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setWeatherMode(opt.value)}
              className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                weatherMode === opt.value ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setWeatherMode('auto')}
            className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              weatherMode === 'auto' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Auto (real weather)
          </button>
        </div>
        {weatherMode === 'auto' && (
          <input
            type="text"
            value={weatherCity}
            onChange={(e) => setWeatherCity(e.target.value)}
            placeholder="City — e.g. Chennai"
            className="mt-1.5 w-full rounded-lg bg-black/5 px-3 py-2 text-[13px] text-stone-800 outline-none placeholder:text-stone-500 focus:bg-black/[0.07]"
          />
        )}

        {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-stone-600 transition-colors hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-stone-800 px-4 py-1.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
