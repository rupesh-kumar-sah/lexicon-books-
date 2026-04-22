import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../constants';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="h-10 bg-slate-900 text-slate-400 px-8 flex items-center justify-between text-[10px] tracking-wide flex-shrink-0 z-10 w-full overflow-hidden">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-1 uppercase">
          <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.9L10 .3l7.834 4.6a1 1 0 01.5 1.175l-1.735 9.176a1 1 0 01-.643.766L10 19.7l-5.956-3.683a1 1 0 01-.643-.766L1.666 6.075a1 1 0 01.5-1.175zM10 2.373L3.816 6.002 5.166 13.16 10 16.143l4.834-2.983 1.35-7.158L10 2.373zM10 5a1 1 0 011 1v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0v-2H7a1 1 0 110-2h2V6a1 1 0 011-1z" clipRule="evenodd"></path>
          </svg>
          Secure SSL Checkout
        </span>
        <span className="uppercase hidden sm:inline">30-Day Easy Returns</span>
        <span className="uppercase hidden sm:inline">Global Shipping Available</span>
      </div>
      <div className="flex gap-4">
        <Link to="/privacy" className="hover:text-white cursor-pointer uppercase">Privacy</Link>
        <Link to="/terms" className="hover:text-white cursor-pointer uppercase">Terms</Link>
        <span className="uppercase">&copy; {currentYear} LEXICON MEDIA GROUP</span>
      </div>
    </footer>
  );
}
