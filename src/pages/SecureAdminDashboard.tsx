import React, { useState, useEffect } from 'react';
import { Lock, LogOut, Loader2 } from 'lucide-react';

interface AdminSession {
  token: string;
  authenticated: boolean;
}

export default function SecureAdminDashboard() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check existing session
  useEffect(() => {
    const stored = localStorage.getItem('admin_session');
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        localStorage.removeItem('admin_session');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, pin }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      const newSession = { token: data.token, authenticated: true };
      
      setSession(newSession);
      localStorage.setItem('admin_session', JSON.stringify(newSession));
      setEmail('');
      setPassword('');
      setPin('');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    setSession(null);
  };

  if (!session?.authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Lock Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full w-24 h-24"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Lock className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-3xl font-bold text-white mb-2 tracking-tight">
            Admin Portal
          </h1>
          <p className="text-center text-slate-400 text-sm mb-8 font-medium">
            Secure access only. Credentials required.
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
            {/* Email */}
            <div className="mb-5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-2 block">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sahkkr702@gmail.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                required
              />
            </div>

            {/* Password */}
            <div className="mb-5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-2 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                required
              />
            </div>

            {/* PIN */}
            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-2 block">
                Security PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="0000"
                maxLength="4"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-red-500/50 outline-none transition-all tracking-widest"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold py-3 rounded-xl hover:from-red-600 hover:to-rose-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {loading ? 'Verifying...' : 'Access Portal'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-slate-500 mt-6">
            This portal is protected by advanced security. All access is logged.
          </p>
        </div>
      </div>
    );
  }

  // Authenticated state - embed Admin component here
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-full px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-xs text-slate-400">Secure Management Portal</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </header>

      {/* Content - Import the Admin component here */}
      <div className="max-w-full">
        {/* The main Admin component will be rendered here after authentication */}
        <iframe
          src="/api/admin-portal/dashboard"
          className="w-full h-screen border-0"
          title="Admin Dashboard"
        />
      </div>
    </div>
  );
}
