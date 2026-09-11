import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, CheckCircle2, Loader2 } from 'lucide-react';

// Honest early-access dialog — payments are not connected yet, so paid CTAs
// never simulate a checkout. The email is saved for real and the visitor is
// told plainly that payment activation is coming.
export default function EarlyAccessDialog({ plan, onClose }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | saving | done | error
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (state === 'saving') return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setState('error');
      setError('Enter A Valid Email Address');
      return;
    }
    setState('saving');
    setError('');
    try {
      const res = await base44.functions.invoke('joinEarlyAccess', { email: trimmed, plan });
      const data = res?.data || res;
      if (data?.error) {
        setState('error');
        setError(data.error);
        return;
      }
      setState('done');
    } catch (err) {
      const errData = err?.response?.data || err?.data || {};
      setState('error');
      setError(errData.error || 'Something Went Wrong — Please Try Again');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="early-access-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        {state === 'done' ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" strokeWidth={1.5} />
            <h2 id="early-access-title" className="mt-4 text-lg font-semibold">
              You're On The List
            </h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              We'll Email You At <span className="text-zinc-200">{email.trim()}</span> The Moment Payment Activation Goes Live For {plan}.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-2.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 id="early-access-title" className="text-lg font-semibold pr-8">
              Payment Activation Coming Soon — Join Early Access
            </h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              {plan} Is Not Open For Payments Yet. Leave Your Email And We'll Notify You The Moment It Activates — Nothing Is Charged Today.
            </p>
            <form onSubmit={handleSubmit} className="mt-5 space-y-3" noValidate>
              <label htmlFor="early-access-email" className="block text-sm text-zinc-300">
                Email Address
              </label>
              <input
                id="early-access-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (state === 'error') setState('idle'); }}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-400/60"
              />
              {state === 'error' && (
                <p className="text-[12px] text-red-400" role="alert">{error}</p>
              )}
              <button
                type="submit"
                disabled={state === 'saving'}
                className="w-full py-2.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {state === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                {state === 'saving' ? 'Saving…' : 'Join Early Access'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}