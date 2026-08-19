import { avatarColor } from '../utils/avatarColor';

// One shared avatar renderer — a real photo once someone's set one,
// otherwise the existing colored-initial circle everywhere already used.
// Centralizing this means "does this person have a photo" only needs
// handling in one place, not re-implemented at every call site that shows
// a person.
export default function Avatar({ name, avatarUrl, size = 24, className = '' }) {
  const color = avatarColor(name);
  const style = { width: size, height: size, fontSize: Math.max(9, size * 0.42) };

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} style={style} className={`flex-none rounded-full object-cover ${className}`} />;
  }

  return (
    <div
      style={{ ...style, backgroundColor: color.bg, color: color.fg }}
      className={`flex flex-none items-center justify-center rounded-full font-semibold ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
