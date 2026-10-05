import { useState } from 'react';
import {
  FileBadge,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit,
  Truck,
  UserCheck,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  useDocumentRadar,
  useAssetDocuments,
  useCreateAssetDocument,
  useUpdateAssetDocument,
  useDeleteAssetDocument,
  useOperatorCertifications,
  useCreateOperatorCertification,
  useUpdateOperatorCertification,
  useDeleteOperatorCertification,
} from '../../api/certifications';
import { useFlota } from '../../api/flota';
import { useFaenas } from '../../api/faenas';
import {
  Asset,
  Faena,
  AssetDocType,
  OperatorDocType,
  AssetDocument,
  OperatorCertification,
  RadarTimelineItem,
  ExpirationStatus,
} from '../../types/models';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

const ASSET_DOC_LABELS: Record<AssetDocType, string> = {
  REVISION_TECNICA: 'Revisión Técnica',
  PERMISO_CIRCULACION: 'Permiso de Circulación',
  SEGURO_SOAP: 'Seguro Obligatorio (SOAP)',
  SEGURO_DANOS: 'Seguro Daños / Todo Riesgo',
  CERTIFICACION_ESTRUCTURAL: 'Certificación Estructural / Grúa',
  ANALISIS_GASES: 'Análisis de Gases',
  CERTIFICADO_HOMOLOGACION: 'Certificado de Homologación',
  OTRO: 'Otro Documento Técnico',
};

const OPERATOR_DOC_LABELS: Record<OperatorDocType, string> = {
  LICENCIA_CONDUCIR: 'Licencia Municipal (D/A2/A4)',
  EXAMEN_OCUPACIONAL: 'Examen Ocupacional / Altura',
  INDUCCION_DAS: 'Inducción Faena (DAS)',
  CERTIFICACION_MAQUINARIA: 'Acreditación Operador Pesado',
  CONTRATO_TRABAJO: 'Contrato de Trabajo',
  ENTREGA_EPP: 'Registro Entrega EPP',
  OTRO: 'Otra Certificación Personal',
};

export function CertificacionesPage() {
  const [activeTab, setActiveTab] = useState<'radar' | 'assets' | 'operators'>('radar');

  // Queries
  const { data: radarData, isLoading: loadingRadar } = useDocumentRadar();
  const { data: assetDocs, isLoading: loadingAssetDocs } = useAssetDocuments();
  const { data: operatorCerts, isLoading: loadingOpCerts } = useOperatorCertifications();
  const { data: assets } = useFlota();
  const { data: faenas } = useFaenas();

  // Mutations
  const createAssetDocMut = useCreateAssetDocument();
  const updateAssetDocMut = useUpdateAssetDocument();
  const deleteAssetDocMut = useDeleteAssetDocument();

  const createOpCertMut = useCreateOperatorCertification();
  const updateOpCertMut = useUpdateOperatorCertification();
  const deleteOpCertMut = useDeleteOperatorCertification();

  // Radar Filters
  const [radarFilter, setRadarFilter] = useState<'ALL' | 'VENCIDO' | 'CRITICO' | 'POR_VENCER' | 'ASSET' | 'OPERATOR'>('ALL');
  const [radarSearch, setRadarSearch] = useState('');

  // Asset Docs Filters & State
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedAssetFilter, setSelectedAssetFilter] = useState('');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAssetDoc, setEditingAssetDoc] = useState<AssetDocument | null>(null);
  const [assetFormData, setAssetFormData] = useState({
    assetId: '',
    docType: 'REVISION_TECNICA' as AssetDocType,
    documentNumber: '',
    issuingEntity: '',
    issueDate: '',
    expirationDate: '',
    fileUrl: '',
    notes: '',
  });

  // Operator Certs Filters & State
  const [opSearch, setOpSearch] = useState('');
  const [selectedFaenaFilter, setSelectedFaenaFilter] = useState('');
  const [isOpModalOpen, setIsOpModalOpen] = useState(false);
  const [editingOpCert, setEditingOpCert] = useState<OperatorCertification | null>(null);
  const [opFormData, setOpFormData] = useState({
    operatorName: '',
    rut: '',
    jobTitle: '',
    faenaId: '',
    docType: 'LICENCIA_CONDUCIR' as OperatorDocType,
    documentNumber: '',
    issuingEntity: '',
    issueDate: '',
    expirationDate: '',
    fileUrl: '',
    notes: '',
  });

  // Helpers for Status Badges
  const renderStatusBadge = (status: ExpirationStatus, daysRemaining: number) => {
    switch (status) {
      case 'VENCIDO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
            <AlertTriangle size={12} />
            <span>Vencido ({Math.abs(daysRemaining)} d)</span>
          </span>
        );
      case 'CRITICO_5':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30">
            <Clock size={12} />
            <span>Crítico ({daysRemaining} d)</span>
          </span>
        );
      case 'POR_VENCER_15':
      case 'POR_VENCER_30':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Calendar size={12} />
            <span>Por vencer ({daysRemaining} d)</span>
          </span>
        );
      case 'VIGENTE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={12} />
            <span>Vigente ({daysRemaining} d)</span>
          </span>
        );
    }
  };

  // Asset Form Handlers
  const handleOpenCreateAssetDoc = () => {
    setEditingAssetDoc(null);
    setAssetFormData({
      assetId: assets?.[0]?.id || '',
      docType: 'REVISION_TECNICA',
      documentNumber: '',
      issuingEntity: '',
      issueDate: '',
      expirationDate: '',
      fileUrl: '',
      notes: '',
    });
    setIsAssetModalOpen(true);
  };

  const handleOpenEditAssetDoc = (doc: AssetDocument) => {
    setEditingAssetDoc(doc);
    setAssetFormData({
      assetId: doc.assetId,
      docType: doc.docType,
      documentNumber: doc.documentNumber || '',
      issuingEntity: doc.issuingEntity || '',
      issueDate: doc.issueDate ? doc.issueDate.split('T')[0] : '',
      expirationDate: doc.expirationDate ? doc.expirationDate.split('T')[0] : '',
      fileUrl: doc.fileUrl || '',
      notes: doc.notes || '',
    });
    setIsAssetModalOpen(true);
  };

  const handleSaveAssetDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetFormData.assetId || !assetFormData.expirationDate) {
      alert('Por favor complete la maquinaria y la fecha de vencimiento');
      return;
    }

    try {
      if (editingAssetDoc) {
        await updateAssetDocMut.mutateAsync({
          id: editingAssetDoc.id,
          data: assetFormData,
        });
      } else {
        await createAssetDocMut.mutateAsync(assetFormData);
      }
      setIsAssetModalOpen(false);
    } catch {
      alert('Error al guardar el documento de maquinaria');
    }
  };

  const handleDeleteAssetDoc = async (id: string) => {
    if (confirm('¿Confirma que desea eliminar este documento?')) {
      await deleteAssetDocMut.mutateAsync(id);
    }
  };

  // Operator Form Handlers
  const handleOpenCreateOpCert = () => {
    setEditingOpCert(null);
    setOpFormData({
      operatorName: '',
      rut: '',
      jobTitle: '',
      faenaId: faenas?.[0]?.id || '',
      docType: 'LICENCIA_CONDUCIR',
      documentNumber: '',
      issuingEntity: '',
      issueDate: '',
      expirationDate: '',
      fileUrl: '',
      notes: '',
    });
    setIsOpModalOpen(true);
  };

  const handleOpenEditOpCert = (cert: OperatorCertification) => {
    setEditingOpCert(cert);
    setOpFormData({
      operatorName: cert.operatorName,
      rut: cert.rut,
      jobTitle: cert.jobTitle || '',
      faenaId: cert.faenaId || '',
      docType: cert.docType,
      documentNumber: cert.documentNumber || '',
      issuingEntity: cert.issuingEntity || '',
      issueDate: cert.issueDate ? cert.issueDate.split('T')[0] : '',
      expirationDate: cert.expirationDate ? cert.expirationDate.split('T')[0] : '',
      fileUrl: cert.fileUrl || '',
      notes: cert.notes || '',
    });
    setIsOpModalOpen(true);
  };

  const handleSaveOpCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opFormData.operatorName || !opFormData.rut || !opFormData.expirationDate) {
      alert('Por favor complete el nombre, RUT y fecha de vencimiento');
      return;
    }

    try {
      if (editingOpCert) {
        await updateOpCertMut.mutateAsync({
          id: editingOpCert.id,
          data: opFormData,
        });
      } else {
        await createOpCertMut.mutateAsync(opFormData);
      }
      setIsOpModalOpen(false);
    } catch {
      alert('Error al guardar la acreditación del operador');
    }
  };

  const handleDeleteOpCert = async (id: string) => {
    if (confirm('¿Confirma que desea eliminar esta certificación?')) {
      await deleteOpCertMut.mutateAsync(id);
    }
  };

  // Filtered radar items
  const filteredRadarItems = (radarData?.radarItems || []).filter((item: RadarTimelineItem) => {
    if (radarFilter === 'VENCIDO' && item.status !== 'VENCIDO') return false;
    if (radarFilter === 'CRITICO' && item.status !== 'CRITICO_5') return false;
    if (radarFilter === 'POR_VENCER' && item.status !== 'POR_VENCER_15' && item.status !== 'POR_VENCER_30') return false;
    if (radarFilter === 'ASSET' && item.category !== 'ASSET') return false;
    if (radarFilter === 'OPERATOR' && item.category !== 'OPERATOR') return false;

    if (radarSearch) {
      const q = radarSearch.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle.toLowerCase().includes(q);
      const matchDoc = (item.documentNumber || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSubtitle && !matchDoc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-xs font-bold tracking-wider uppercase">
              Control Legal y Operacional
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              Semáforo Preventivo 30/15/5 Días
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <FileBadge className="text-indigo-400" size={30} />
            Gestión Documental y Certificaciones
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Control integral de vigencias legales para flota pesada (revisiones técnicas, seguros, permisos) y acreditaciones de operadores (licencias D, exámenes de altura, inducciones DAS).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'assets' && (
            <Button
              onClick={handleOpenCreateAssetDoc}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 px-4 py-2.5 rounded-xl flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Nuevo Doc. Maquinaria</span>
            </Button>
          )}
          {activeTab === 'operators' && (
            <Button
              onClick={handleOpenCreateOpCert}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 px-4 py-2.5 rounded-xl flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Nueva Acreditación Operador</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Documentos Vencidos</p>
              <h3 className="text-2xl font-black text-red-600 dark:text-red-400 mt-0.5">
                {radarData?.metrics.expiredTotal ?? 0}
              </h3>
              <p className="text-[11px] text-red-500/80 font-medium mt-0.5">Acción inmediata requerida</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <AlertTriangle size={22} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Críticos (≤ 5 Días)</p>
              <h3 className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-0.5">
                {radarData?.metrics.criticalTotal ?? 0}
              </h3>
              <p className="text-[11px] text-orange-500/80 font-medium mt-0.5">En proceso de renovación</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <Clock size={22} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Por Vencer (≤ 30 Días)</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {radarData?.metrics.warningTotal ?? 0}
              </h3>
              <p className="text-[11px] text-amber-500/80 font-medium mt-0.5">Alerta preventiva temprana</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Calendar size={22} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Expedientes</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {(radarData?.metrics.totalAssetDocs ?? 0) + (radarData?.metrics.totalOperatorCerts ?? 0)}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                {radarData?.metrics.totalAssetDocs ?? 0} Flota | {radarData?.metrics.totalOperatorCerts ?? 0} Personal
              </p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <ShieldAlert size={22} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'radar'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert size={18} />
          Radar de Vencimientos
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'assets'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Truck size={18} />
          Documentos de Maquinaria ({assetDocs?.length ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('operators')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'operators'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck size={18} />
          Acreditaciones de Personal ({operatorCerts?.length ?? 0})
        </button>
      </div>

      {/* TAB 1: RADAR DE VENCIMIENTOS */}
      {activeTab === 'radar' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setRadarFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  radarFilter === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Todos ({radarData?.radarItems?.length || 0})
              </button>

              <button
                onClick={() => setRadarFilter('VENCIDO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  radarFilter === 'VENCIDO'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 hover:bg-red-100'
                }`}
              >
                Vencidos ({radarData?.metrics.expiredTotal || 0})
              </button>

              <button
                onClick={() => setRadarFilter('CRITICO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  radarFilter === 'CRITICO'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 hover:bg-orange-100'
                }`}
              >
                Críticos ≤ 5d ({radarData?.metrics.criticalTotal || 0})
              </button>

              <button
                onClick={() => setRadarFilter('POR_VENCER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  radarFilter === 'POR_VENCER'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                Por Vencer ≤ 30d ({radarData?.metrics.warningTotal || 0})
              </button>

              <button
                onClick={() => setRadarFilter('ASSET')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  radarFilter === 'ASSET'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100'
                }`}
              >
                Solo Flota
              </button>

              <button
                onClick={() => setRadarFilter('OPERATOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  radarFilter === 'OPERATOR'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 hover:bg-purple-100'
                }`}
              >
                Solo Operadores
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por equipo, RUT, doc..."
                value={radarSearch}
                onChange={(e) => setRadarSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {loadingRadar ? (
            <div className="p-12 text-center text-slate-400 text-xs">Cargando radar de vencimientos...</div>
          ) : filteredRadarItems.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">¡Todo al día!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                No hay documentos ni certificaciones que coincidan con los filtros seleccionados.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRadarItems.map((item) => (
                <Card
                  key={`${item.category}-${item.id}`}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg ${
                            item.category === 'ASSET'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          {item.category === 'ASSET' ? <Truck size={16} /> : <UserCheck size={16} />}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
                            {item.category === 'ASSET' ? 'Maquinaria / Flota' : 'Personal / Operador'}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                            {item.title}
                          </h4>
                        </div>
                      </div>

                      {renderStatusBadge(item.status, item.daysRemaining)}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                        <span>
                          {item.category === 'ASSET'
                            ? ASSET_DOC_LABELS[item.docType as AssetDocType] || item.docType
                            : OPERATOR_DOC_LABELS[item.docType as OperatorDocType] || item.docType}
                        </span>
                        {item.documentNumber && (
                          <span className="text-[11px] font-mono text-slate-500">N° {item.documentNumber}</span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.subtitle}</p>

                      {item.issuingEntity && (
                        <p className="text-[11px] text-slate-400 italic">Emisor: {item.issuingEntity}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        Vence: {new Date(item.expirationDate).toLocaleDateString('es-CL')}
                      </span>
                      {item.fileUrl && (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                        >
                          <ExternalLink size={12} />
                          Ver Archivo
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DOCUMENTACIÓN DE FLOTA */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedAssetFilter}
                onChange={(e) => setSelectedAssetFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                <option value="">Todas las maquinarias</option>
                {(assets || []).map((a: Asset) => (
                  <option key={a.id} value={a.id}>
                    {a.internalNumber} - {a.brand} {a.model} ({a.licensePlate || 'S/P'})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por documento, número..."
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Equipo / Maquinaria</th>
                    <th className="p-3.5">Tipo Documento</th>
                    <th className="p-3.5">N° / Póliza</th>
                    <th className="p-3.5">Entidad Emisora</th>
                    <th className="p-3.5">Vencimiento</th>
                    <th className="p-3.5">Estado Semáforo</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingAssetDocs ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        Cargando documentos de maquinaria...
                      </td>
                    </tr>
                  ) : (assetDocs || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No hay documentos registrados para la flota.
                      </td>
                    </tr>
                  ) : (
                    (assetDocs || [])
                      .filter((d) => {
                        if (selectedAssetFilter && d.assetId !== selectedAssetFilter) return false;
                        if (assetSearch) {
                          const q = assetSearch.toLowerCase();
                          const matchNum = (d.documentNumber || '').toLowerCase().includes(q);
                          const matchType = (ASSET_DOC_LABELS[d.docType] || '').toLowerCase().includes(q);
                          const matchAsset = (d.asset?.internalNumber || '').toLowerCase().includes(q);
                          if (!matchNum && !matchType && !matchAsset) return false;
                        }
                        return true;
                      })
                      .map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3.5 font-bold text-slate-800 dark:text-slate-100">
                            {d.asset?.internalNumber} ({d.asset?.type})
                            <span className="block text-[11px] font-normal text-slate-400">
                              {d.asset?.brand} {d.asset?.model} · {d.asset?.licensePlate || 'S/P'}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-200">
                            {ASSET_DOC_LABELS[d.docType] || d.docType}
                          </td>
                          <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                            {d.documentNumber || '—'}
                          </td>
                          <td className="p-3.5 text-slate-500 dark:text-slate-400">{d.issuingEntity || '—'}</td>
                          <td className="p-3.5 font-medium text-slate-700 dark:text-slate-200">
                            {new Date(d.expirationDate).toLocaleDateString('es-CL')}
                          </td>
                          <td className="p-3.5">{renderStatusBadge(d.status, d.daysRemaining)}</td>
                          <td className="p-3.5 text-right space-x-1">
                            <button
                              onClick={() => handleOpenEditAssetDoc(d)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                              title="Editar Documento"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteAssetDoc(d.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                              title="Eliminar Documento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: ACREDITACIONES DE OPERADORES */}
      {activeTab === 'operators' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedFaenaFilter}
                onChange={(e) => setSelectedFaenaFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                <option value="">Todas las faenas</option>
                {(faenas || []).map((f: Faena) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por operador, RUT, cargo..."
                value={opSearch}
                onChange={(e) => setOpSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Operador / Trabajador</th>
                    <th className="p-3.5">RUT</th>
                    <th className="p-3.5">Cargo / Función</th>
                    <th className="p-3.5">Faena</th>
                    <th className="p-3.5">Certificación / Doc</th>
                    <th className="p-3.5">Vencimiento</th>
                    <th className="p-3.5">Semáforo</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingOpCerts ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        Cargando acreditaciones de personal...
                      </td>
                    </tr>
                  ) : (operatorCerts || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        No hay certificaciones de personal registradas.
                      </td>
                    </tr>
                  ) : (
                    (operatorCerts || [])
                      .filter((c) => {
                        if (selectedFaenaFilter && c.faenaId !== selectedFaenaFilter) return false;
                        if (opSearch) {
                          const q = opSearch.toLowerCase();
                          const matchName = c.operatorName.toLowerCase().includes(q);
                          const matchRut = c.rut.toLowerCase().includes(q);
                          const matchJob = (c.jobTitle || '').toLowerCase().includes(q);
                          if (!matchName && !matchRut && !matchJob) return false;
                        }
                        return true;
                      })
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3.5 font-bold text-slate-800 dark:text-slate-100">{c.operatorName}</td>
                          <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{c.rut}</td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300">{c.jobTitle || 'Operador'}</td>
                          <td className="p-3.5 text-slate-500 dark:text-slate-400">{c.faena?.name || 'Base Central'}</td>
                          <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-200">
                            {OPERATOR_DOC_LABELS[c.docType] || c.docType}
                          </td>
                          <td className="p-3.5 font-medium text-slate-700 dark:text-slate-200">
                            {new Date(c.expirationDate).toLocaleDateString('es-CL')}
                          </td>
                          <td className="p-3.5">{renderStatusBadge(c.status, c.daysRemaining)}</td>
                          <td className="p-3.5 text-right space-x-1">
                            <button
                              onClick={() => handleOpenEditOpCert(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                              title="Editar Certificación"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteOpCert(c.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                              title="Eliminar Certificación"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL ASSET DOCUMENT */}
      <Modal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title={editingAssetDoc ? 'Editar Documento de Maquinaria' : 'Registrar Documento de Maquinaria'}
      >
        <form onSubmit={handleSaveAssetDoc} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Equipo / Maquinaria *
            </label>
            <select
              value={assetFormData.assetId}
              onChange={(e) => setAssetFormData({ ...assetFormData, assetId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
              required
            >
              <option value="">Seleccione equipo...</option>
              {(assets || []).map((a: Asset) => (
                <option key={a.id} value={a.id}>
                  {a.internalNumber} ({a.type}) - {a.brand} {a.model} [{a.licensePlate || 'S/P'}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Documento *
              </label>
              <select
                value={assetFormData.docType}
                onChange={(e) => setAssetFormData({ ...assetFormData, docType: e.target.value as AssetDocType })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
              >
                {Object.entries(ASSET_DOC_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="N° de Documento / Póliza"
              placeholder="Ej: RT-98234 o POL-8832"
              value={assetFormData.documentNumber}
              onChange={(e) => setAssetFormData({ ...assetFormData, documentNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Entidad Emisora / Empresa"
              placeholder="Ej: PRT San Dámaso, BCI Seguros..."
              value={assetFormData.issuingEntity}
              onChange={(e) => setAssetFormData({ ...assetFormData, issuingEntity: e.target.value })}
            />
            <Input
              label="URL / Enlace al Archivo"
              placeholder="https://... o ruta en nube"
              value={assetFormData.fileUrl}
              onChange={(e) => setAssetFormData({ ...assetFormData, fileUrl: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fecha de Emisión"
              type="date"
              value={assetFormData.issueDate}
              onChange={(e) => setAssetFormData({ ...assetFormData, issueDate: e.target.value })}
            />
            <Input
              label="Fecha de Vencimiento *"
              type="date"
              value={assetFormData.expirationDate}
              onChange={(e) => setAssetFormData({ ...assetFormData, expirationDate: e.target.value })}
              required
            />
          </div>

          <Input
            label="Observaciones"
            placeholder="Notas adicionales o condiciones de renovación..."
            value={assetFormData.notes}
            onChange={(e) => setAssetFormData({ ...assetFormData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAssetModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createAssetDocMut.isPending || updateAssetDocMut.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              Guardar Documento
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL OPERATOR CERTIFICATION */}
      <Modal
        isOpen={isOpModalOpen}
        onClose={() => setIsOpModalOpen(false)}
        title={editingOpCert ? 'Editar Acreditación de Personal' : 'Registrar Acreditación de Personal'}
      >
        <form onSubmit={handleSaveOpCert} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombre Completo del Operador *"
              placeholder="Ej: Juan Pérez Morales"
              value={opFormData.operatorName}
              onChange={(e) => setOpFormData({ ...opFormData, operatorName: e.target.value })}
              required
            />
            <Input
              label="RUT del Operador *"
              placeholder="Ej: 14.567.890-K"
              value={opFormData.rut}
              onChange={(e) => setOpFormData({ ...opFormData, rut: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Cargo / Función"
              placeholder="Ej: Operador Excavadora 320D"
              value={opFormData.jobTitle}
              onChange={(e) => setOpFormData({ ...opFormData, jobTitle: e.target.value })}
            />
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Faena Asignada
              </label>
              <select
                value={opFormData.faenaId}
                onChange={(e) => setOpFormData({ ...opFormData, faenaId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
              >
                <option value="">Base Central / Sin Faena</option>
                {(faenas || []).map((f: Faena) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Certificación / Doc *
              </label>
              <select
                value={opFormData.docType}
                onChange={(e) => setOpFormData({ ...opFormData, docType: e.target.value as OperatorDocType })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
              >
                {Object.entries(OPERATOR_DOC_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="N° Certificado / Registro"
              placeholder="Ej: LIC-87236 o DAS-2026-09"
              value={opFormData.documentNumber}
              onChange={(e) => setOpFormData({ ...opFormData, documentNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Entidad Emisora / OTEC / Mutua"
              placeholder="Ej: ACHS, Mutual, Dirección del Tránsito..."
              value={opFormData.issuingEntity}
              onChange={(e) => setOpFormData({ ...opFormData, issuingEntity: e.target.value })}
            />
            <Input
              label="URL / Enlace al Archivo"
              placeholder="https://..."
              value={opFormData.fileUrl}
              onChange={(e) => setOpFormData({ ...opFormData, fileUrl: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fecha de Emisión"
              type="date"
              value={opFormData.issueDate}
              onChange={(e) => setOpFormData({ ...opFormData, issueDate: e.target.value })}
            />
            <Input
              label="Fecha de Vencimiento *"
              type="date"
              value={opFormData.expirationDate}
              onChange={(e) => setOpFormData({ ...opFormData, expirationDate: e.target.value })}
              required
            />
          </div>

          <Input
            label="Observaciones"
            placeholder="Notas..."
            value={opFormData.notes}
            onChange={(e) => setOpFormData({ ...opFormData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsOpModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createOpCertMut.isPending || updateOpCertMut.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              Guardar Acreditación
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
