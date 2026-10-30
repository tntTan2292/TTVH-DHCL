import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { buildWelcomeText, consumeWelcome } from './welcomeMessage.js';

const VISIBLE_MS = 6000;

export default function WelcomeToast() {
  const { user } = useAuth();
  const [text, setText] = useState('');

  useEffect(() => {
    if (!user || text) return undefined;
    if (!consumeWelcome()) return undefined;
    setText(buildWelcomeText(user));
    return undefined;
  }, [user, text]);

  useEffect(() => {
    if (!text) return undefined;
    const timer = setTimeout(() => setText(''), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  if (!text) return null;
  return (
    <div role="status" className="fixed right-4 top-20 z-[60] flex max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-xl border border-blue-200/80 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl backdrop-blur">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-vnpost-orange)]" />
      <span>{text}</span>
      <button type="button" onClick={() => setText('')} aria-label="Đóng" className="ml-1 text-slate-400 hover:text-slate-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
