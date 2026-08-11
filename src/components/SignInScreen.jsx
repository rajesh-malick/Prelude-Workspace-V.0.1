import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import zuperLogo from '../assets/zuper-logo.jpg';

const ALLOWED_DOMAIN = 'zuper.co';

export default function SignInScreen({ onSignIn }) {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Only @${ALLOWED_DOMAIN} email addresses can ${mode === 'signup' ? 'sign up' : 'sign in'}.`);
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const body =
        mode === 'signup'
          ? { name: name.trim(), email: trimmedEmail, password, confirmPassword }
          : { email: trimmedEmail, password };
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.');
        return;
      }
      onSignIn(data.user, data.isNewUser);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    mode === 'signup'
      ? name.trim() && email.trim() && password && confirmPassword
      : email.trim() && password;

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
        className="glass-surface w-[380px] rounded-2xl p-6"
      >
        <div className="flex flex-col items-center text-center">
          <img src={zuperLogo} alt="Zuper" className="h-7 w-auto" />
          <h1 className="mt-4 text-[19px] font-semibold text-stone-800">Prelude</h1>
          <p className="mt-1 text-[12.5px] text-stone-500">Zuper's living workspace for design review.</p>
        </div>

        <div className="mt-5 flex items-center gap-1 rounded-lg bg-black/5 p-1">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`flex-1 rounded-md py-1.5 text-[12.5px] font-medium transition-colors ${
              mode === 'signin' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
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

          <label className="mt-3 block text-[11.5px] font-medium text-stone-500">Zuper email</label>
          <input
            type="email"
            autoFocus={mode === 'signin'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@zuper.co"
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

          {mode === 'signup' && (
            <>
              <label className="mt-3 block text-[11.5px] font-medium text-stone-500">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg bg-black/5 px-3 py-2 text-[13px] text-stone-800 outline-none placeholder:text-stone-400 focus:bg-black/[0.07]"
              />
              <p className="mt-1.5 text-[10.5px] text-stone-400">At least 8 characters.</p>
            </>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">
              <AlertCircle size={14} strokeWidth={2} className="mt-0.5 flex-none" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="mt-4 w-full rounded-full bg-stone-800 py-2.5 text-[13px] font-medium text-white transition-opacity disabled:opacity-40"
          >
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Enter the Grove' : 'Plant your Grove'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
