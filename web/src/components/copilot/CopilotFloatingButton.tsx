import { Sparkles } from 'lucide-react';

interface Props {
  onClick: () => void;
}

export function CopilotFloatingButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 text-white shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 group cursor-pointer"
      title="Abrir SGMT Copilot (Ctrl + K)"
    >
      <div className="relative">
        <Sparkles size={17} className="animate-pulse text-amber-300" />
      </div>
      <span className="text-xs font-bold tracking-wide">SGMT Copilot</span>
      <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-black/30 text-slate-200 border border-white/20 font-mono">
        Ctrl+K
      </span>
    </button>
  );
}
