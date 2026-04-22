import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import AILibrarian from './AILibrarian';
import { motion } from 'motion/react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="min-h-full"
        >
          {children}
        </motion.div>
      </main>
      <AILibrarian />
      <Footer />
    </div>
  );
}
