import React from 'react';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { Shield } from 'lucide-react';

export default function Privacy() {
  const { settings } = useSiteSettings();
  
  return (
    <div className="bg-slate-50 min-h-screen py-24">
      <div className="max-w-3xl mx-auto px-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-12 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-8">Privacy Policy</h1>
          <div className="prose prose-slate max-w-none">
            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
              {settings.privacyContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
