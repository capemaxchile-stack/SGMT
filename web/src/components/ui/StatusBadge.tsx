
import { Badge } from './Badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusUpper = status.toUpperCase();
  
  let variant: 'default' | 'success' | 'warning' | 'danger' | 'info' = 'default';

  if (['ACTIVA', 'APROBADA', 'COMPLETADA'].includes(statusUpper)) variant = 'success';
  if (['PENDIENTE', 'EN_PROCESO', 'REVISIÓN'].includes(statusUpper)) variant = 'warning';
  if (['CERRADA', 'RECHAZADA', 'CANCELADA', 'INACTIVA'].includes(statusUpper)) variant = 'danger';
  if (['NUEVA', 'BORRADOR'].includes(statusUpper)) variant = 'info';

  return (
    <Badge variant={variant} className={className}>
      {statusUpper}
    </Badge>
  );
}
