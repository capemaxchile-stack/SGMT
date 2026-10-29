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
      {/* KATEI Hexagonal Emblem with Amber K */}
      <svg
        className={cn('shrink-0 drop-shadow-sm', iconSizes[size])}
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <path
          d="M16 1.5 28.6 8.75v14.5L16 30.5 3.4 23.25V8.75Z"
          fill="#141c19"
          stroke="#22c55e"
          strokeWidth="1.6"
        />
        <path
          d="M11 9v14M11 16.5 19.5 9M13.6 14.2 20.5 23"
          stroke="#fbbf24"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'font-extrabold tracking-[0.18em] text-slate-900 dark:text-white',
                textSizes[size],
                textColor
              )}
            >
              KATEI
            </span>
          </div>
          {variant === 'full' && (
            <span className="text-[10px] text-slate-500 dark:text-emerald-400/80 font-medium tracking-tight mt-0.5 hidden sm:block">
              Gestión Operativa &bull; Flota &amp; Maquinaria
            </span>
          )}
        </div>
      )}
    </div>
  );
}
