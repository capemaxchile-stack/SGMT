import { useState, useEffect } from 'react';
import {
  useNotificationChannelsConfig,
  useUpdateNotificationChannelsConfig,
  useTestNotificationChannel,
} from '../../api/notifications';
import { NotificationChannelsConfig } from '../../types/models';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Send,
  Mail,
  Webhook,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  BellRing,
} from 'lucide-react';

export function NotificationChannelsTab() {
  const { data: config, isLoading } = useNotificationChannelsConfig();
  const updateMutation = useUpdateNotificationChannelsConfig();
  const testMutation = useTestNotificationChannel();

  const [formData, setFormData] = useState<NotificationChannelsConfig>({
    telegram: {
      enabled: false,
      botToken: '',
      chatId: '',
      events: { radarAlerts: true, lowStock: true, pendingApprovals: true, abnormalFuel: true },
    },
    brevo: {
      enabled: false,
      apiKey: '',
      senderEmail: 'alertas@sgmt.local',
      senderName: 'SGMT Alertas Operacionales',
      recipientEmails: [],
      events: { radarAlerts: true, lowStock: true, pendingApprovals: true, abnormalFuel: true },
    },
    webhook: {
      enabled: false,
      url: '',
      events: { radarAlerts: false, lowStock: false, pendingApprovals: false, abnormalFuel: false },
    },
  });

  const [recipientEmailsText, setRecipientEmailsText] = useState('');
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [showBrevoKey, setShowBrevoKey] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [testResult, setTestResult] = useState<{ channel: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (config) {
      setFormData(config);
      setRecipientEmailsText(config.brevo?.recipientEmails?.join(', ') || '');
    }
  }, [config]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg('');
    setTestResult(null);

    const emails = recipientEmailsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload: NotificationChannelsConfig = {
      ...formData,
      brevo: {
        ...formData.brevo,
        recipientEmails: emails,
      },
    };

    try {
      await updateMutation.mutateAsync(payload);
      setSaveSuccessMsg('¡Configuración de canales de alerta guardada exitosamente!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch {
      alert('Error al guardar la configuración');
    }
  };

  const handleTestChannel = async (channel: 'TELEGRAM' | 'BREVO') => {
    setTestResult(null);
    try {
      const emails = recipientEmailsText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await testMutation.mutateAsync({
        channel,
        telegramConfig: channel === 'TELEGRAM' ? formData.telegram : undefined,
        brevoConfig:
          channel === 'BREVO'
            ? { ...formData.brevo, recipientEmails: emails }
            : undefined,
      });

      setTestResult({
        channel,
        success: res.success,
        message: res.message,
      });
    } catch (err: any) {
      setTestResult({
        channel,
        success: false,
        message: err.response?.data?.message || err.message || 'Error al ejecutar prueba de envío',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 text-sm">
        Cargando configuración de canales de alerta...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-amber-500 text-white shadow-md shadow-blue-500/20">
            <BellRing size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">Configurador de Alertas y Notificaciones</h3>
            <p className="text-xs text-slate-400">
              Automatizá el envío de alertas críticas hacia Telegram, Brevo Email y Webhooks externos.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          isLoading={updateMutation.isPending}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-600/30 shrink-0"
        >
          Guardar Cambios
        </Button>
      </div>

      {saveSuccessMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {testResult && (
        <div
          className={`flex items-start gap-2 p-3.5 rounded-xl border text-xs font-medium animate-in fade-in ${
            testResult.success
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border-red-800 text-red-300'
          }`}
        >
          {testResult.success ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
          <div>
            <strong>Prueba {testResult.channel}:</strong> {testResult.message}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. TELEGRAM BOT CHANNEL */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  <Send size={18} />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Canal Telegram Bot
                  </CardTitle>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Envío instantáneo a grupos o canales privados de faena
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.telegram.enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      telegram: { ...formData.telegram, enabled: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-sky-500"></div>
              </label>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Input
                  label="Token del Bot de Telegram"
                  type={showTelegramToken ? 'text' : 'password'}
                  placeholder="123456789:ABCDefGhIJKlmNoPQRstu..."
                  value={formData.telegram.botToken || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      telegram: { ...formData.telegram, botToken: e.target.value },
                    })
                  }
                  helperText="Obtenido al crear tu bot con @BotFather en Telegram"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTelegramToken(!showTelegramToken)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showTelegramToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <Input
                label="Chat ID / Canal ID Destino"
                type="text"
                placeholder="-100123456789 o @canal_alertas"
                value={formData.telegram.chatId || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    telegram: { ...formData.telegram, chatId: e.target.value },
                  })
                }
                helperText="ID numérico del grupo/canal o @username público"
              />

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Eventos Suscritos para Telegram:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.telegram.events.radarAlerts}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telegram: {
                            ...formData.telegram,
                            events: { ...formData.telegram.events, radarAlerts: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>🛡️ Radar Mantención</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.telegram.events.lowStock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telegram: {
                            ...formData.telegram,
                            events: { ...formData.telegram.events, lowStock: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>📦 Stock Crítico</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.telegram.events.pendingApprovals}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telegram: {
                            ...formData.telegram,
                            events: { ...formData.telegram.events, pendingApprovals: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>📝 OCs por Aprobar</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.telegram.events.abnormalFuel}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telegram: {
                            ...formData.telegram,
                            events: { ...formData.telegram.events, abnormalFuel: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>⛽ Diésel Anómalo</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testMutation.isPending}
              onClick={() => handleTestChannel('TELEGRAM')}
              className="w-full flex items-center justify-center gap-2 text-xs border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
            >
              <Send size={14} />
              <span>Probar Envío a Telegram</span>
            </Button>
          </div>
        </Card>

        {/* 2. BREVO EMAIL CHANNEL */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Mail size={18} />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Canal Correo Brevo (Sendinblue)
                  </CardTitle>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Notificaciones formales por correo transaccional
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.brevo.enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brevo: { ...formData.brevo, enabled: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
              </label>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Input
                  label="Brevo API Key (v3)"
                  type={showBrevoKey ? 'text' : 'password'}
                  placeholder="xkeysib-1234567890abcdef..."
                  value={formData.brevo.apiKey || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brevo: { ...formData.brevo, apiKey: e.target.value },
                    })
                  }
                  helperText="Encontrala en tu panel Brevo > SMTP & API > API Keys"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowBrevoKey(!showBrevoKey)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showBrevoKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Correo Remitente"
                  type="email"
                  placeholder="alertas@tuempresa.cl"
                  value={formData.brevo.senderEmail || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brevo: { ...formData.brevo, senderEmail: e.target.value },
                    })
                  }
                />
                <Input
                  label="Nombre Remitente"
                  type="text"
                  placeholder="SGMT Alertas"
                  value={formData.brevo.senderName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brevo: { ...formData.brevo, senderName: e.target.value },
                    })
                  }
                />
              </div>

              <Input
                label="Destinatarios (separados por coma)"
                type="text"
                placeholder="jefe.taller@empresa.cl, gerencia@empresa.cl"
                value={recipientEmailsText}
                onChange={(e) => setRecipientEmailsText(e.target.value)}
                helperText="Casillas que recibirán las alertas automáticas"
              />

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Eventos Suscritos para Correo:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.brevo.events.radarAlerts}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          brevo: {
                            ...formData.brevo,
                            events: { ...formData.brevo.events, radarAlerts: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>🛡️ Radar Mantención</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.brevo.events.lowStock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          brevo: {
                            ...formData.brevo,
                            events: { ...formData.brevo.events, lowStock: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>📦 Stock Crítico</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.brevo.events.pendingApprovals}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          brevo: {
                            ...formData.brevo,
                            events: { ...formData.brevo.events, pendingApprovals: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>📝 OCs por Aprobar</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.brevo.events.abnormalFuel}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          brevo: {
                            ...formData.brevo,
                            events: { ...formData.brevo.events, abnormalFuel: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>⛽ Diésel Anómalo</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testMutation.isPending}
              onClick={() => handleTestChannel('BREVO')}
              className="w-full flex items-center justify-center gap-2 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <Mail size={14} />
              <span>Probar Envío vía Brevo</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* 3. WEBHOOK CHANNEL */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Webhook size={18} />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Webhook / Integraciones Externas (Slack, Teams, ERP)
              </CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Envía eventos en formato JSON hacia cualquier URL HTTP POST
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.webhook?.enabled || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  webhook: {
                    enabled: e.target.checked,
                    url: formData.webhook?.url || '',
                    events: formData.webhook?.events || {
                      radarAlerts: false,
                      lowStock: false,
                      pendingApprovals: false,
                      abnormalFuel: false,
                    },
                  },
                })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-purple-500"></div>
          </label>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <Input
            label="URL de Endpoint Webhook (POST)"
            type="url"
            placeholder="https://hooks.slack.com/services/... o https://tu-erp.cl/api/sgmt-webhook"
            value={formData.webhook?.url || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                webhook: {
                  enabled: formData.webhook?.enabled || false,
                  url: e.target.value,
                  events: formData.webhook?.events || {
                    radarAlerts: false,
                    lowStock: false,
                    pendingApprovals: false,
                    abnormalFuel: false,
                  },
                },
              })
            }
            helperText="Se enviará un payload JSON con { event, timestamp, data } ante cada alerta"
          />
        </CardContent>
      </Card>
    </form>
  );
}
