import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sprout } from 'lucide-react';

// Cosmetic front door only — there's no backend, so no password is ever
// actually checked. What IS real: accounts created here are remembered
// in this browser (name keyed by email), so signing back in with the
// same email greets you by the right name.
const ACCOUNTS_KEY = 'prelude-accounts';

function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveAccount(email, name) {
  try {
    const accounts = loadAccounts();
    accounts[email] = name;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // storage unavailable — sign-in still works, just isn't remembered
  }
}

function nameFromEmail(email) {
  const prefix = email.split('@')[0] || email;
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

export default function SignInScreen({ onSignIn }) {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    if (mode === 'signup') {
      const trimmedName = name.trim();
      if (!trimmedName) return;
      saveAccount(trimmedEmail, trimmedName);
      onSignIn({ name: trimmedName, email: trimmedEmail });
    } else {
      const accounts = loadAccounts();
      const resolvedName = accounts[trimmedEmail] || nameFromEmail(trimmedEmail);
      onSignIn({ name: resolvedName, email: trimmedEmail });
    }
  };

  const canSubmit = mode === 'signup' ? name.trim() && email.trim() && password : email.trim() && password;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'linear-gradient(to bottom, #FDF6EC 0%, #F3E9D8 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="glass-surface w-[360px] rounded-2xl p-6"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700/10 text-emerald-700">
            <Sprout size={20} strokeWidth={2} />
          </div>
          <h1 className="mt-3 text-[19px] font-semibold text-stone-800">Prelude</h1>
          <p className="mt-1 text-[12.5px] text-stone-500">A living workspace for design review.</p>
        </div>

        <div className="mt-5 flex items-center gap-1 rounded-lg bg-black/5 p-1">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-md py-1.5 text-[12.5px] font-medium transition-colors ${
              mode === 'signin' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-md py-1.5 text-[12.5px] font-medium transition-colors ${
              mode === 'signup' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          {mode === 'signup' && (
            <>
              <label className="block text-[11.5px] font-medium text-stone-500">Name</label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rajesh"
                className="mt-1 w-full rounded-lg bg-black/5 px-3 py-2 text-[13px] text-stone-800 outline-none placeholder:text-stone-400 focus:bg-black/[0.07]"
              />
            </>
          )}

          <label className="mt-3 block text-[11.5px] font-medium text-stone-500">Email</label>
          <input
            type="email"
            autoFocus={mode === 'signin'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="mt-1 w-full rounded-lg bg-black/5 px-3 py-2 text-[13px] text-stone-800 outline-none placeholder:text-stone-400 focus:bg-black/[0.07]"
          />

          <label className="mt-3 block text-[11.5px] font-medium text-stone-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded-lg bg-black/5 px-3 py-2 text-[13px] text-stone-800 outline-none placeholder:text-stone-400 focus:bg-black/[0.07]"
          />
          <p className="mt-1.5 text-[10.5px] text-stone-400">
            Local prototype — nothing is verified, any password gets you in.
          </p>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-4 w-full rounded-full bg-stone-800 py-2.5 text-[13px] font-medium text-white transition-opacity disabled:opacity-40"
          >
            {mode === 'signin' ? 'Enter the Grove' : 'Plant your Grove'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
