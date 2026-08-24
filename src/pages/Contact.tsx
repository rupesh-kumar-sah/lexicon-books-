import { FormEvent, useState } from 'react';
import { CheckCircle2, Loader2, Mail, MessageSquare, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { messageApi } from '../lib/api';
import { useSiteSettings } from '../context/SiteSettingsContext';

export default function Contact() {
  const { settings } = useSiteSettings();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await messageApi.send(form);
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (requestError: any) {
      setError(requestError.message || 'We could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-slate-50 py-10 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[0.8fr,1.2fr] gap-6 lg:gap-10 items-start">
        <section className="pt-2 sm:pt-8">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700"><MessageSquare className="w-4 h-4" />Contact</span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">Let us help with your next read.</h1>
          <p className="mt-5 text-slate-500 leading-relaxed max-w-md">Send a question about an order, a title, or your account. Our team will review your message and reply to the email address you provide.</p>
          <div className="mt-8 flex items-center gap-3 text-sm text-slate-600"><Mail className="w-4 h-4 text-blue-600" /><a href="mailto:sahkkr702@gmail.com" className="hover:text-blue-700 hover:underline">sahkkr702@gmail.com</a></div>
          <Link to="/catalog" className="inline-block mt-8 text-sm font-bold text-blue-700 hover:underline">Browse the catalog →</Link>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8">
          {sent ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto w-12 h-12 text-emerald-600" />
              <h2 className="mt-4 text-2xl font-bold text-slate-900">Message received</h2>
              <p className="mt-2 text-sm text-slate-500">Thanks for reaching out. We will get back to you soon.</p>
              <button type="button" onClick={() => setSent(false)} className="mt-6 text-sm font-bold text-blue-700 hover:underline">Send another message</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5" noValidate>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="space-y-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Name</span><input required maxLength={120} value={form.name} onChange={(event) => update('name', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></label>
                <label className="space-y-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</span><input required type="email" maxLength={254} value={form.email} onChange={(event) => update('email', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></label>
              </div>
              <label className="space-y-2 block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject</span><input maxLength={180} value={form.subject} onChange={(event) => update('subject', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></label>
              <label className="space-y-2 block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Message</span><textarea required minLength={10} maxLength={5000} rows={7} value={form.message} onChange={(event) => update('message', event.target.value)} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></label>
              {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
              <button disabled={submitting} type="submit" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"><Send className="w-4 h-4" />{submitting ? 'Sending…' : 'Send message'}</button>
            </form>
          )}
        </section>
      </div>
      <p className="sr-only">{settings.siteName}</p>
    </div>
  );
}
