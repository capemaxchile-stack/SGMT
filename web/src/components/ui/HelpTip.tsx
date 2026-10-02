import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, X, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HelpTipProps {
  title: string;
  description: string;
  tips?: string[];
  variant?: 'info' | 'warning' | 'success';
  className?: string;
}

export function HelpTip({
  title,
  description,
  tips = [],
  variant = 'info',
  className,
}: HelpTipProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) return null;

  const variantStyles = {
    info: 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200',
    warning: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200',
    success: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200',
  };

  const iconColors = {
    info: 'text-blue-600 dark:text-blue-400',
    warning: 'text-amber-600 dark:text-amber-400',
    success: 'text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div
      className={cn(
        'p-3.5 rounded-xl border text-xs transition-all shadow-sm',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <HelpCircle size={18} className={cn('shrink-0 mt-0.5', iconColors[variant])} />
          <div>
            <div className="font-bold flex items-center gap-1.5">
              <span>{title}</span>
              <Sparkles size={12} className={iconColors[variant]} />
            </div>
            <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {tips.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400"
              title={isExpanded ? 'Ver menos' : 'Ver tips y buenas prácticas'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Ocultar guía"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {isExpanded && tips.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 space-y-1.5 pl-7">
          <div className="font-semibold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Consejos de operación y flujo:
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
            {tips.map((tip, idx) => (
              <li key={idx} className="leading-normal">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
