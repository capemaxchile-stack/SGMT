
import { Badge } from './Badge';

interface StatusBadgeProps {
  status?: string;
  className?: string;
}

export function StatusBadge({ status = '', className }: StatusBadgeProps) {
  const statusUpper = (status || '').toUpperCase();
  
  let variant: 'default' | 'success' | 'warning' | 'danger' | 'info' = 'default';

  if (['ACTIVA', 'APROBADA', 'COMPLETADA', 'INGRESO', 'OPERATIVO'].includes(statusUpper)) variant = 'success';
  if (['PENDIENTE', 'PENDIENTE_APROBACION', 'EN_PROCESO', 'REVISIÓN', 'AJUSTE', 'EN_MANTENCION'].includes(statusUpper)) variant = 'warning';
  if (['CERRADA', 'RECHAZADA', 'CANCELADA', 'INACTIVA', 'SALIDA', 'DETENIDO'].includes(statusUpper)) variant = 'danger';
  if (['NUEVA', 'BORRADOR', 'EN_FORMACION'].includes(statusUpper)) variant = 'info';

  return (
    <Badge variant={variant} className={className}>
      {statusUpper || 'N/A'}
    </Badge>
  );
}
