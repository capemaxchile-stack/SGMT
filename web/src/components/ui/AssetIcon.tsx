import { cn } from '../../lib/utils';
import { AssetType } from '../../types/models';

interface AssetIconProps {
  type: AssetType | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
}

export function AssetIcon({
  type,
  className,
  size = 'md',
  showBadge = false,
}: AssetIconProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 p-1 text-xs',
    md: 'w-9 h-9 p-1.5 text-sm',
    lg: 'w-11 h-11 p-2 text-base',
    xl: 'w-14 h-14 p-2.5 text-lg',
  };

  const badgeColors: Record<string, string> = {
    EXCAVADORA: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
    RETROEXCAVADORA: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800',
    BULLDOZER: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/70 dark:text-yellow-300 dark:border-yellow-800',
    CAMION_TOLVA: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800',
    CAMION_PLUMA: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800',
    CAMIONETA: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
    RODILLO: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
    MOTONIVELADORA: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800',
    CARGADOR_FRONTAL: 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700',
    OTRO: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const renderSvg = () => {
    switch (type) {
      case 'EXCAVADORA':
        return (
          // Excavator with cabin, boom, arm and bucket
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
            {/* Orugas */}
            <rect x="6" y="34" width="24" height="8" rx="4" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
            <circle cx="10" cy="38" r="2" fill="#94a3b8" />
            <circle cx="18" cy="38" r="2" fill="#94a3b8" />
            <circle cx="26" cy="38" r="2" fill="#94a3b8" />
            {/* Cabina y cuerpo */}
            <rect x="8" y="22" width="18" height="12" rx="2" fill="#f59e0b" />
            <rect x="10" y="24" width="6" height="5" rx="1" fill="#38bdf8" />
            {/* Pluma y Brazo */}
            <path d="M22 26L32 14L40 22L44 32" stroke="#d97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Balde */}
            <path d="M40 30L46 34L42 38L38 34Z" fill="#b45309" stroke="#78350f" strokeWidth="1" />
            {/* Articulaciones */}
            <circle cx="32" cy="14" r="1.5" fill="#1e293b" />
            <circle cx="40" cy="22" r="1.5" fill="#1e293b" />
          </svg>
        );

      case 'RETROEXCAVADORA':
        return (
          // Backhoe with front bucket and rear digger
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
            {/* Ruedas */}
            <circle cx="14" cy="36" r="5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="14" cy="36" r="2" fill="#94a3b8" />
            <circle cx="32" cy="37" r="4" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="32" cy="37" r="1.5" fill="#94a3b8" />
            {/* Cabina */}
            <rect x="12" y="20" width="16" height="15" rx="2" fill="#ea580c" />
            <rect x="15" y="22" width="8" height="6" rx="1" fill="#bae6fd" />
            {/* Balde frontal */}
            <path d="M28 29L38 29L42 37L36 37Z" fill="#c2410c" />
            {/* Brazo trasero */}
            <path d="M12 28L4 18L2 28" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M2 28L6 32L2 34Z" fill="#7c2d12" />
          </svg>
        );

      case 'BULLDOZER':
        return (
          // Bulldozer with blade and heavy track
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
            {/* Oruga pesada */}
            <rect x="10" y="32" width="28" height="10" rx="5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="16" cy="37" r="2.5" fill="#64748b" />
            <circle cx="24" cy="37" r="2.5" fill="#64748b" />
            <circle cx="32" cy="37" r="2.5" fill="#64748b" />
            {/* Cabina angular */}
            <path d="M14 32L18 18H28L32 32H14Z" fill="#eab308" />
            <rect x="20" y="21" width="6" height="6" rx="1" fill="#bae6fd" />
            {/* Hoja topadora frontal */}
            <path d="M4 22L8 22L8 42L4 42C2 42 2 22 4 22Z" fill="#ca8a04" stroke="#854d0e" strokeWidth="1" />
            {/* Brazo empuje */}
            <path d="M8 36L14 34" stroke="#854d0e" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );

      case 'CAMION_TOLVA':
        return (
          // Dump truck with inclined bed
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
            {/* Ruedas dobles */}
            <circle cx="12" cy="37" r="4.5" fill="#1e293b" />
            <circle cx="12" cy="37" r="1.5" fill="#94a3b8" />
            <circle cx="32" cy="37" r="4.5" fill="#1e293b" />
            <circle cx="32" cy="37" r="1.5" fill="#94a3b8" />
            <circle cx="40" cy="37" r="4.5" fill="#1e293b" />
            <circle cx="40" cy="37" r="1.5" fill="#94a3b8" />
            {/* Cabina */}
            <path d="M6 34V22C6 20 8 18 10 18H16V34H6Z" fill="#2563eb" />
            <rect x="8" y="21" width="5" height="5" rx="1" fill="#bae6fd" />
            {/* Tolva de volteo */}
            <path d="M18 32L20 18L44 14L42 32H18Z" fill="#1d4ed8" stroke="#1e40af" strokeWidth="1" />
          </svg>
        );

      case 'CAMION_PLUMA':
        return (
          // Crane truck with boom
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
            {/* Ruedas */}
            <circle cx="10" cy="37" r="4" fill="#1e293b" />
            <circle cx="32" cy="37" r="4" fill="#1e293b" />
            <circle cx="40" cy="37" r="4" fill="#1e293b" />
            {/* Chasis */}
            <rect x="6" y="30" width="38" height="6" fill="#334155" />
            <rect x="6" y="20" width="10" height="10" fill="#4f46e5" />
            <rect x="8" y="22" width="4" height="4" fill="#bae6fd" />
            {/* Brazo pluma telescópica */}
            <path d="M22 30L34 10L44 6" stroke="#4338ca" strokeWidth="3" strokeLinecap="round" />
            {/* Gancho */}
            <path d="M44 6V16L42 18" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );

      case 'CAMIONETA':
        return (
          // Pick-up truck 4x4
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
            {/* Ruedas */}
            <circle cx="12" cy="35" r="4.5" fill="#1e293b" />
            <circle cx="12" cy="35" r="1.5" fill="#94a3b8" />
            <circle cx="36" cy="35" r="4.5" fill="#1e293b" />
            <circle cx="36" cy="35" r="1.5" fill="#94a3b8" />
            {/* Carrocería */}
            <path d="M4 32V26C4 25 5 24 6 24H14L20 16H30V24H44V32H4Z" fill="#059669" />
            {/* Ventanas */}
            <path d="M16 23L20 18H28V23H16Z" fill="#a7f3d0" />
            {/* Pick-up bed */}
            <rect x="32" y="24" width="11" height="8" fill="#047857" />
          </svg>
        );

      case 'RODILLO':
        return (
          // Compactor / Roller
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
            {/* Rodillo frontal grande */}
            <circle cx="36" cy="34" r="8" fill="#475569" stroke="#1e293b" strokeWidth="2" />
            <circle cx="36" cy="34" r="3" fill="#94a3b8" />
            {/* Rueda trasera */}
            <circle cx="12" cy="35" r="6" fill="#1e293b" />
            {/* Cabina */}
            <rect x="8" y="16" width="16" height="18" rx="2" fill="#9333ea" />
            <rect x="11" y="19" width="8" height="6" fill="#f3e8ff" />
            {/* Articulación central */}
            <path d="M24 30L34 30" stroke="#7e22ce" strokeWidth="4" strokeLinecap="round" />
          </svg>
        );

      case 'MOTONIVELADORA':
        return (
          // Motor grader with long front neck and middle blade
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
            {/* Ruedas traseras */}
            <circle cx="10" cy="36" r="4" fill="#1e293b" />
            <circle cx="18" cy="36" r="4" fill="#1e293b" />
            {/* Rueda delantera */}
            <circle cx="42" cy="36" r="4" fill="#1e293b" />
            {/* Cabina trasera */}
            <rect x="8" y="20" width="14" height="15" fill="#0d9488" />
            <rect x="10" y="22" width="6" height="5" fill="#ccfbf1" />
            {/* Cuello largo frontal */}
            <path d="M22 26L42 32" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
            {/* Vertedera / Cuchilla central */}
            <path d="M26 40L34 34" stroke="#115e59" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        );

      case 'CARGADOR_FRONTAL':
        return (
          // Front loader
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
            {/* Ruedas grandes */}
            <circle cx="14" cy="34" r="6" fill="#1e293b" />
            <circle cx="14" cy="34" r="2" fill="#94a3b8" />
            <circle cx="30" cy="34" r="6" fill="#1e293b" />
            <circle cx="30" cy="34" r="2" fill="#94a3b8" />
            {/* Cabina */}
            <path d="M10 28L14 16H24L26 28H10Z" fill="#d97706" />
            <rect x="15" y="18" width="6" height="6" fill="#fef3c7" />
            {/* Brazo cargador y balde */}
            <path d="M26 28L38 20L44 26" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
            <path d="M42 22L46 32H38Z" fill="#78350f" />
          </svg>
        );

      default:
        return (
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
            <circle cx="12" cy="36" r="4" fill="#334155" />
            <circle cx="36" cy="36" r="4" fill="#334155" />
            <rect x="8" y="20" width="32" height="14" rx="3" fill="#64748b" />
            <rect x="12" y="22" width="8" height="5" fill="#e2e8f0" />
          </svg>
        );
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 transition-transform group-hover:scale-105',
          sizeClasses[size]
        )}
        title={type}
      >
        {renderSvg()}
      </div>

      {showBadge && (
        <span
          className={cn(
            'px-2 py-0.5 rounded text-[11px] font-bold border',
            badgeColors[type] || badgeColors.OTRO
          )}
        >
          {type}
        </span>
      )}
    </div>
  );
}
