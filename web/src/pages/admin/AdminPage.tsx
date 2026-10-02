import { useState } from 'react';
import { usePurchaseOrders, useUpdateOrderStatus } from '../../api/compras';
import { useAuditLogs, useUsers, AuditLog } from '../../api/audit';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { PurchaseOrder } from '../../types/compras';
import { User } from '../../types/models';
import { Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'aprobaciones' | 'auditoria' | 'usuarios'>('aprobaciones');
  const toast = useToast();

  // Queries
  const { data: orders, isLoading: loadingOrders } = usePurchaseOrders();
  const { data: auditLogs, isLoading: loadingAudit } = useAuditLogs();
  const { data: users, isLoading: loadingUsers } = useUsers();
  
  const updateStatusMutation = useUpdateOrderStatus();
  const [mutatingOrderId, setMutatingOrderId] = useState<string | null>(null);

  // Super User Modal
  const [isSuperUserModalOpen, setIsSuperUserModalOpen] = useState(false);
  const [superOrderId, setSuperOrderId] = useState<string>('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [superKey, setSuperKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const pendingOrders = orders?.filter(o => o.status === 'PENDIENTE_APROBACION') || [];

  const handleApprove = async (orderId: string) => {
    setMutatingOrderId(orderId);
    try {
      await updateStatusMutation.mutateAsync({ id: orderId, action: 'APROBADA', level: 1, comments: 'Aprobación estándar' });
      toast.success('Orden de compra aprobada exitosamente');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message || 'Error al aprobar la orden de compra';
      toast.error(msg);
    } finally {
      setMutatingOrderId(null);
    }
  };

  const handleReject = async (orderId: string) => {
    setMutatingOrderId(orderId);
    try {
      await updateStatusMutation.mutateAsync({ id: orderId, action: 'RECHAZADA', level: 1, comments: 'Rechazado' });
      toast.info('Orden de compra rechazada');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message || 'Error al rechazar la orden de compra';
      toast.error(msg);
    } finally {
      setMutatingOrderId(null);
    }
  };

  const handleOpenSuperApprove = (orderId: string) => {
    setSuperOrderId(orderId);
    setExceptionReason('');
    setSuperKey('');
    setErrorMsg('');
    setIsSuperUserModalOpen(true);
  };

  const handleSuperApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionReason || !superKey) {
      const msg = 'Debe ingresar motivo y clave de autorización.';
      setErrorMsg(msg);
      toast.warning(msg);
      return;
    }
    try {
      await updateStatusMutation.mutateAsync({ 
        id: superOrderId, 
        action: 'EXCEPCION', 
        level: 1, 
        comments: 'Aprobación por excepción de Súper Usuario',
        exceptionReason,
        superKey 
      });
      setIsSuperUserModalOpen(false);
      toast.success('Orden aprobada por excepción');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message || 'Error en la autorización.';
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const ordersColumns = [
    {
      header: 'N° Orden',
      cell: (item: PurchaseOrder) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
          {item.orderNumber}
        </span>
      ),
    },
    {
      header: 'Proveedor',
      cell: (item: PurchaseOrder) => (
        <span className="font-semibold text-slate-800">{item.supplier?.businessName}</span>
      ),
    },
    {
      header: 'Total ($ CLP)',
      cell: (item: PurchaseOrder) => (
        <span className="font-bold text-slate-900">${Number(item.totalAmount).toLocaleString('es-CL')}</span>
      ),
    },
    {
      header: 'Estado',
      cell: (item: PurchaseOrder) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Acciones',
      cell: (item: PurchaseOrder) => (
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
            title="Aprobar OC"
            disabled={updateStatusMutation.isPending && mutatingOrderId === item.id}
            onClick={() => handleApprove(item.id)}
          >
            <CheckCircle size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 disabled:opacity-50"
            title="Rechazar OC"
            disabled={updateStatusMutation.isPending && mutatingOrderId === item.id}
            onClick={() => handleReject(item.id)}
          >
            <XCircle size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:text-amber-700 disabled:opacity-50"
            title="Aprobación Especial Súper Usuario"
            disabled={updateStatusMutation.isPending && mutatingOrderId === item.id}
            onClick={() => handleOpenSuperApprove(item.id)}
          >
            <AlertCircle size={16} />
          </Button>
        </div>
      ),
    },
  ];

  const auditColumns = [
    {
      header: 'Fecha',
      cell: (log: AuditLog) => <span className="text-sm">{new Date(log.createdAt).toLocaleString()}</span>,
    },
    {
      header: 'Usuario',
      cell: (log: AuditLog) => <span className="text-sm font-medium">{log.user?.name || log.userId}</span>,
    },
    {
      header: 'Acción',
      cell: (log: AuditLog) => <span className="text-sm font-bold">{log.action}</span>,
    },
    {
      header: 'Entidad',
      cell: (log: AuditLog) => <span className="text-sm">{log.entity}</span>,
    },
    {
      header: 'IP',
      cell: (log: AuditLog) => <span className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded">{log.ipAddress}</span>,
    },
    {
      header: 'Detalle',
      cell: (log: AuditLog) => (
        <pre className="text-xs bg-slate-50 p-1 border rounded max-w-xs overflow-auto">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      ),
    },
  ];

  const userColumns = [
    {
      header: 'Nombre',
      cell: (u: User) => <span className="font-semibold">{u.name}</span>,
    },
    {
      header: 'Email',
      cell: (u: User) => <span className="text-sm text-slate-600">{u.email}</span>,
    },
    {
      header: 'Estado',
      cell: (u: User) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {u.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="text-primary-600" />
            Panel de Administración
          </h1>
          <p className="text-slate-500">Configuración global, auditoría y aprobaciones</p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('aprobaciones')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'aprobaciones'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Bandeja de Aprobaciones
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'auditoria'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Bitácora de Auditoría
          </button>
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'usuarios'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Usuarios y Roles
          </button>
        </nav>
      </div>

      {activeTab === 'aprobaciones' && (
        <DataTable
          data={pendingOrders}
          columns={ordersColumns}
          isLoading={loadingOrders}
          emptyMessage="No hay órdenes pendientes de aprobación"
        />
      )}

      {activeTab === 'auditoria' && (
        <DataTable
          data={auditLogs || []}
          columns={auditColumns}
          isLoading={loadingAudit}
          emptyMessage="No hay registros de auditoría"
        />
      )}

      {activeTab === 'usuarios' && (
        <DataTable
          data={users || []}
          columns={userColumns}
          isLoading={loadingUsers}
          emptyMessage="No hay usuarios registrados"
        />
      )}

      <Modal isOpen={isSuperUserModalOpen} onClose={() => setIsSuperUserModalOpen(false)} title="Aprobación Súper Usuario">
        <form onSubmit={handleSuperApprove} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
              {errorMsg}
            </div>
          )}
          <Input 
            label="Motivo de la excepción *" 
            placeholder="Ej: Aprobación urgente" 
            value={exceptionReason} 
            onChange={(e) => setExceptionReason(e.target.value)} 
            required 
          />
          <Input 
            label="Clave Doble Autenticación *" 
            type="password"
            placeholder="Ingrese llave del súper usuario" 
            value={superKey} 
            onChange={(e) => setSuperKey(e.target.value)} 
            required 
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsSuperUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={updateStatusMutation.isPending}>
              Aprobar por Excepción
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
