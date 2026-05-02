import React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, BookOpen, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verifyAdmin, setVerifyAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setVerifyAdmin(false);
    setError(null);
    setSubmitting(false);
  };

  const close = () => {
    closeAuthModal();
    setTimeout(reset, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password, verifyAdmin);
      } else {
        if (!displayName.trim()) throw new Error('Please enter your name');
        await signUp(email.trim(), password, displayName.trim());
      }
      close();
    } catch (err: any) {
      if (err.message?.includes('Admin security verification required')) {
        setVerifyAdmin(true);
        setError('Please allow location access to verify admin identity.');
      } else {
        setError(err.message || 'Authentication failed');
      }
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
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
              <button
                onClick={close}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">BookSellNP</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                {mode === 'signin' ? 'Sign in to continue your reading journey.' : 'Join the modern literary portal.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {!verifyAdmin && (
                <>
                  {mode === 'signup' && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Name</label>
                      <div className="relative mt-1.5">
                        <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Jane Doe"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email</label>
                    <div className="relative mt-1.5">
                      <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="reader@booksellnp.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
                    <div className="relative mt-1.5">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        required
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        minLength={6}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      />
                    </div>
                  </div>
                </>
              )}

              {verifyAdmin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden bg-blue-50 border border-blue-100 rounded-xl p-4 text-center"
                >
                  <ShieldCheck className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-900 text-sm mb-1">Admin Verification Required</h3>
                  <p className="text-xs text-slate-600">
                    To access the admin dashboard, we need to verify your location and device. Please click the button below and allow location access when prompted.
                  </p>
                </motion.div>
              )}

              {error && (
                <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyAdmin ? 'Verify Device & Location' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              {!verifyAdmin && (
                <div className="text-center text-sm text-slate-500">
                  {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode(mode === 'signin' ? 'signup' : 'signin');
                    }}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
