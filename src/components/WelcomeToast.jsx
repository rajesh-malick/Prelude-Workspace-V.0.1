import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sprout, MapPin } from 'lucide-react';

// A short, one-time tour right after signup — orients a brand-new visitor
// before dropping them into the Grove. Two beats: the Grove/comment idea,
// then Focus mode + visiting teammates' territories. Each step dismisses
// itself after a while, or on click; closing either step ends the tour.
const STEPS = [
  {
    icon: Sprout,
    title: (name) => `Welcome, ${name}`,
    text: "Your grove is empty — plant a project and see it grow. Each tree is a project, each bloom a version, and every prototype can be clicked on directly to leave a comment right there.",
  },
  {
    icon: MapPin,
    title: () => 'Prefer a plain list?',
    text: "Switch to Focus mode any time for a conventional dashboard view — same data, no 3D. And the Territory switcher up top lets you visit any teammate's Grove to comment on their work too.",
  },
];

export default function WelcomeToast({ name, onDismiss }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  useEffect(() => {
    const t = setTimeout(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
      if (step === STEPS.length - 1) onDismiss();
    }, 7000);
    return () => clearTimeout(t);
  }, [step, onDismiss]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: -16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.96 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass-surface fixed left-1/2 top-24 z-40 w-[360px] -translate-x-1/2 rounded-2xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-emerald-700/10 text-emerald-700">
            <current.icon size={16} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-stone-800">{current.title(name)}</div>
            <p className="mt-1 text-[12px] leading-snug text-stone-600">{current.text}</p>
            {STEPS.length > 1 && (
              <div className="mt-2 flex items-center gap-1">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i === step ? 'w-4 bg-emerald-600' : 'w-1.5 bg-stone-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-black/5 hover:text-stone-600"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
