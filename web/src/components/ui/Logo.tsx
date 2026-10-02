import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'compact';
  textColor?: string;
}

export function Logo({
  className,
  size = 'md',
  variant = 'full',
  textColor,
}: LogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      {/* SGMT Excavation / Heavy Machine Icon */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-blue-950 p-1.5 shadow-md border border-slate-700/50 shrink-0',
          iconSizes[size]
        )}
      >
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
          {/* Earthwork profile */}
          <path
            d="M10 46L24 22L38 34L50 14"
            stroke="#3b82f6"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Excavator tooth / amber chevron */}
          <path d="M32 46L44 46L52 36L42 36Z" fill="#f59e0b" />
          {/* Track line */}
          <path d="M8 50H54" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
          {/* Joints */}
          <circle cx="24" cy="22" r="3" fill="#60a5fa" />
          <circle cx="50" cy="14" r="3" fill="#f59e0b" />
        </svg>
      </div>

      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'font-black tracking-wider text-slate-900 dark:text-white',
                textSizes[size],
                textColor
              )}
            >
              SGMT
            </span>
            {variant === 'full' && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                PRO
              </span>
            )}
          </div>
          {variant === 'full' && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-tight mt-0.5 hidden sm:block">
              Gestión Movimiento de Tierra
            </span>
          )}
        </div>
      )}
    </div>
  );
}
