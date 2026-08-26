import React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, BookOpen, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [forgotMode, setForgotMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
    setResetMessage(null);
    setForgotMode(false);
    setSubmitting(false);
  };

  const close = () => {
    closeAuthModal();
    setTimeout(reset, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    setSubmitting(true);
    try {
      if (forgotMode) {
        await authApi.requestPasswordReset(email.trim());
        setResetMessage('If an account exists for that email, a one-time reset code will be sent shortly.');
        return;
      }
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        if (!displayName.trim()) throw new Error('Please enter your name');
        await signUp(email.trim(), password, displayName.trim());
      }
      close();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {authModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
              <button
                type="button"
                onClick={close}
                aria-label="Close authentication dialog"
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">BookSellNP</span>
              </div>
              <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight">
                {forgotMode ? 'Reset your password' : mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                {forgotMode ? 'We will send a secure, time-limited reset code.' : mode === 'signin' ? 'Sign in to continue your reading journey.' : 'Join the modern literary portal.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5" aria-busy={submitting}>
              {forgotMode ? (
                <>
                  <div>
                    <label htmlFor="auth-reset-email" className="text-sm font-semibold text-slate-800">Email address</label>
                    <div className="relative mt-1.5">
                      <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        id="auth-reset-email"
                        name="email"
                        required
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="reader@booksellnp.com"
                        maxLength={254}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      />
                    </div>
                  </div>
                  {resetMessage && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">{resetMessage}</div>}
                  {error && <div role="alert" aria-live="polite" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</div>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send Reset Code
                  </button>
                  <button type="button" onClick={() => { setForgotMode(false); setResetMessage(null); setError(null); }} className="w-full text-sm font-bold text-blue-600 hover:underline">Back to Sign In</button>
                </>
              ) : (
              <>
              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className="text-sm font-semibold text-slate-800">Name</label>
                  <div className="relative mt-1.5">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      id="auth-name"
                      name="name"
                      required
                      autoComplete="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Jane Doe"
                      maxLength={120}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className="text-sm font-semibold text-slate-800">Email address</label>
                <div className="relative mt-1.5">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="auth-email"
                    name="email"
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="reader@booksellnp.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="auth-password" className="text-sm font-semibold text-slate-800">Password</label>
                <div className="relative mt-1.5">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="auth-password"
                    name="password"
                    required
                    type="password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 to 128 characters"
                    minLength={8}
                    maxLength={128}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>

              {mode === 'signin' && (
                <div className="text-right">
                  <button type="button" onClick={() => { setForgotMode(true); setError(null); setResetMessage(null); }} className="text-sm font-bold text-blue-600 hover:underline">Forgot password?</button>
                </div>
              )}

              {error && (
                <div role="alert" aria-live="polite" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              {mode === 'signin' && (
                <>
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400"><span className="h-px flex-1 bg-slate-200" />Or<span className="h-px flex-1 bg-slate-200" /></div>
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/api/auth/google'; }}
                    className="w-full border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  >
                    <span className="text-base font-black">G</span>
                    Continue with Google
                  </button>
                </>
              )}

              <div className="text-center text-sm text-slate-500">
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setResetMessage(null);
                    setForgotMode(false);
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                  }}
                  className="font-bold text-blue-600 hover:underline"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
              </>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
