
import { Badge } from './Badge';

interface StatusBadgeProps {
  status?: string;
  className?: string;
}

export function StatusBadge({ status = '', className }: StatusBadgeProps) {
  const statusUpper = (status || '').toUpperCase();
  
  let variant: 'default' | 'success' | 'warning' | 'danger' | 'info' = 'default';

  if (['ACTIVA', 'ACTIVO', 'APROBADA', 'APROBADO', 'COMPLETADA', 'COMPLETADO', 'FINALIZADA', 'FINALIZADO', 'INGRESO', 'OPERATIVO', 'RECEPCION_TOTAL', 'ENTREGADO', 'DISPONIBLE', 'VIGENTE'].includes(statusUpper)) variant = 'success';
  if (['PENDIENTE', 'PENDIENTE_APROBACION', 'EN_PROCESO', 'EN_PROGRESO', 'EN_REVISION', 'REVISION', 'REVISIÓN', 'AJUSTE', 'EN_MANTENCION', 'EN_MANTENIMIENTO', 'RECEPCION_PARCIAL', 'EN_ESPERA_REPUESTOS', 'PAUSADA', 'PAUSADO', 'POR_VENCER_30', 'POR_VENCER_15'].includes(statusUpper)) variant = 'warning';
  if (['CERRADA', 'CERRADO', 'RECHAZADA', 'RECHAZADO', 'CANCELADA', 'CANCELADO', 'INACTIVA', 'INACTIVO', 'SALIDA', 'DETENIDO', 'PANNE', 'VENCIDO', 'DE_BAJA', 'CRITICO_5', 'ALTO_RIESGO'].includes(statusUpper)) variant = 'danger';
  if (['NUEVA', 'NUEVO', 'BORRADOR', 'ABIERTA', 'ABIERTO', 'EN_FORMACION', 'EMITIDA', 'EMITIDO', 'SOLICITADA', 'SOLICITADO', 'COTIZACION', 'EN_ORDEN_COMPRA'].includes(statusUpper)) variant = 'info';

  return (
    <Badge variant={variant} className={className}>
      {statusUpper || 'N/A'}
    </Badge>
  );
}
