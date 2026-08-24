import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { authApi } from '../lib/api';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!email.trim()) {
      setError('Enter the email address that received the reset code.');
      return;
    }
    if (!/^\d{8}$/.test(code.trim())) {
      setError('Enter the 8-digit reset code from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await authApi.resetPassword(email.trim(), code.trim(), password);
      setMessage(result.message);
      setCode('');
      setPassword('');
      setConfirmation('');
    } catch (err: any) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-slate-50 px-4 py-16">
      <section className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"><BookOpen className="h-5 w-5" /></div>
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Lexicon Books</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
          <p className="mt-1 text-sm text-blue-100">Enter the secure one-time code sent to your email, then choose a new password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-8">
          {message && <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}
          {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

          <div>
            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Email address</label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input required disabled={Boolean(message)} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="reader@example.com" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" />
            </div>
          </div>

          <div>
            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">8-digit reset code</label>
            <div className="relative mt-1.5">
              <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input required disabled={Boolean(message)} inputMode="numeric" autoComplete="one-time-code" maxLength={8} pattern="[0-9]{8}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="12345678" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 font-mono text-sm font-bold tracking-[0.25em] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" />
            </div>
          </div>

          <div>
            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">New password</label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input required disabled={Boolean(message)} type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" />
            </div>
          </div>

          <div>
            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Confirm password</label>
            <div className="relative mt-1.5">
              <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input required disabled={Boolean(message)} type="password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your new password" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" />
            </div>
          </div>

          <button type="submit" disabled={submitting || Boolean(message)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
          <Link to="/" className="block text-center text-sm font-bold text-blue-600 hover:underline">Return to Lexicon Books</Link>
        </form>
      </section>
    </main>
  );
}
