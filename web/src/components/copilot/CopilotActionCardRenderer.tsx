import { useNavigate } from 'react-router-dom';
import { CopilotActionCard } from '../../types/copilot';
import { AlertTriangle, Wrench, ShoppingBag, Truck, DollarSign, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  card: CopilotActionCard;
  onNavigate?: () => void;
}

export function CopilotActionCardRenderer({ card, onNavigate }: Props) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (card.actionButton?.route) {
      navigate(card.actionButton.route);
      if (onNavigate) onNavigate();
    }
  };

  const getIcon = () => {
    switch (card.type) {
      case 'CRITICAL_STOCK':
        return <AlertTriangle size={18} className="text-red-400" />;
      case 'MAINTENANCE_RADAR':
        return <Wrench size={18} className="text-amber-400" />;
      case 'PENDING_APPROVALS':
        return <ShoppingBag size={18} className="text-blue-400" />;
      case 'FLEET_STATUS':
        return <Truck size={18} className="text-emerald-400" />;
      case 'FAENA_COSTS':
        return <DollarSign size={18} className="text-cyan-400" />;
      default:
        return <ArrowRight size={18} className="text-slate-400" />;
    }
  };

  const getBadgeClass = () => {
    switch (card.badgeVariant) {
      case 'danger':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'warning':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'success':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'info':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="my-2 p-3.5 rounded-xl border border-slate-700/80 bg-slate-800/90 shadow-md backdrop-blur-sm transition-all hover:border-slate-600">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700">
            {getIcon()}
          </div>
          <h4 className="text-sm font-bold text-slate-100">{card.title}</h4>
        </div>
        {card.badge && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass()}`}>
            {card.badge}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-300 mb-3">{card.description}</p>

      {card.actionButton && (
        <Button
          size="sm"
          onClick={handleAction}
          className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow font-medium"
        >
          <span>{card.actionButton.label}</span>
          <ArrowRight size={14} />
        </Button>
      )}
    </div>
  );
}
