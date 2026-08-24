import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import AuthModal from './AuthModal';
import AIAssistant from './AIAssistant';
import { motion } from 'motion/react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen w-full overflow-x-clip bg-slate-50 text-slate-900 font-sans flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-slate-900 focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
      >
        Skip to main content
      </a>
      <header>
        <Navbar />
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 outline-none">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="min-h-full"
        >
          {children}
        </motion.div>
      </main>
      <Footer />
      <AuthModal />
      <AIAssistant />
    </div>
  );
}
