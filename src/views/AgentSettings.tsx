import { useEffect, useMemo, useState } from 'react';
import {
  activateAgentProfile,
  backfillAgentContext,
  createTelegramLink,
  createTenantAgentRule,
  disableTelegramLink,
  disableTenantAgentRule,
  fetchAgentProfile,
  fetchAiContextTraces,
  fetchOutboundChannelStatus,
  fetchOutboundDeliveries,
  fetchTelegramLinks,
  fetchTenantAgentRules,
  sendOutboundTestMessage,
  sendRecommendationSummaryNow,
  sendSavingsRemindersNow,
  sendTelegramTestMessage,
  type AgentInstructionProfile,
  type AgentInstructionRules,
  type AiContextTrace,
  type ApiRole,
  type OutboundChannelStatusResponse,
  type OutboundMessageDelivery,
  type TenantAgentRule,
  type TelegramChatLink,
} from '../services/api';

interface AgentSettingsProps {
  readonly token: string;
  readonly role: ApiRole;
}

type Tab = 'governance' | 'evidence' | 'channels';

const defaultRules: AgentInstructionRules = {
  objective: 'Generar recomendaciones FinOps accionables, auditables y realistas para FinOps Demo.',
  tone: 'Espanol claro, tecnico cuando haga falta, enfocado en ahorro, riesgo y evidencia.',
  recommendationPriorities: [
    'Priorizar ahorro verificable sobre cambios cosmeticos.',
    'Separar oportunidades de bajo riesgo, riesgo medio y alto riesgo.',
    'Explicar impacto financiero, impacto operativo y supuestos.',
  ],
  evidenceRequirements: [
    'Usar costo, consumo, proveedor, servicio, recurso y periodo cuando existan.',
    'Declarar incertidumbre si faltan metricas de uso o datos historicos.',
    'No prometer ahorro sin mostrar base de calculo.',
  ],
  riskPolicy: 'No recomendar ejecucion automatica. Toda accion debe requerir aprobacion humana y plan reversible.',
  forbiddenActions: ['Ignorar auditoria IA.', 'Exponer credenciales, tokens o secretos.', 'Ejecutar cambios sobre infraestructura cloud.'],
};

const tabs: readonly { readonly id: Tab; readonly label: string; readonly icon: string }[] = [
  { id: 'governance', label: 'Gobierno', icon: 'admin_panel_settings' },
  { id: 'evidence', label: 'Evidencia', icon: 'manage_search' },
  { id: 'channels', label: 'Canales', icon: 'settings_input_component' },
];

const operationLabels: Record<AiContextTrace['operation'], string> = {
  CHAT: 'Chat',
  RECOMMENDATION: 'Recomendaciones',
  EXECUTION_PLAN: 'Plan',
  AUDIT: 'Auditoria',
  LEARNING: 'Aprendizaje',
};

function linesToList(value: string): readonly string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(value: readonly string[]): string {
  return value.join('\n');
}

export default function AgentSettings({ token, role }: AgentSettingsProps) {
  const canConfigureAgent = role === 'ADMIN' || role === 'MASTER_ADMIN' || role === 'OPERATOR_ADMIN';
  const [activeTab, setActiveTab] = useState<Tab>('governance');
  const [profile, setProfile] = useState<AgentInstructionProfile | null>(null);
  const [rules, setRules] = useState<readonly TenantAgentRule[]>([]);
  const [traces, setTraces] = useState<readonly AiContextTrace[]>([]);
  const [telegramLinks, setTelegramLinks] = useState<readonly TelegramChatLink[]>([]);
  const [outboundStatus, setOutboundStatus] = useState<OutboundChannelStatusResponse['status'] | null>(null);
  const [outboundDeliveries, setOutboundDeliveries] = useState<readonly OutboundMessageDelivery[]>([]);
  const [form, setForm] = useState({
    objective: defaultRules.objective,
    tone: defaultRules.tone,
    recommendationPriorities: listToLines(defaultRules.recommendationPriorities),
    evidenceRequirements: listToLines(defaultRules.evidenceRequirements),
    riskPolicy: defaultRules.riskPolicy,
    forbiddenActions: listToLines(defaultRules.forbiddenActions),
    freeformNotes: '',
  });
  const [ruleForm, setRuleForm] = useState({ category: 'costumbre_cliente', ruleText: '', priority: '10' });
  const [telegramForm, setTelegramForm] = useState({ email: '', chatId: '', telegramUserId: '', telegramUsername: '' });
  const [emailTestTarget, setEmailTestTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeRules = useMemo(() => rules.filter((rule) => rule.status === 'ACTIVE'), [rules]);
  const latestTrace = traces[0];
  const errorTraceCount = traces.filter((trace) => trace.status !== 'SUCCESS').length;
  const totalTraceTokens = traces.reduce((total, trace) => total + trace.promptTokenEstimate + (trace.responseTokenEstimate ?? 0), 0);
  const activeTelegramLinks = telegramLinks.filter((link) => link.status === 'ACTIVE').length;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchAgentProfile(token),
      fetchTenantAgentRules(token),
      fetchAiContextTraces(token),
      canConfigureAgent ? fetchTelegramLinks(token) : Promise.resolve({ success: true as const, links: [] }),
      canConfigureAgent ? fetchOutboundChannelStatus(token) : Promise.resolve({ success: true as const, status: null }),
      canConfigureAgent ? fetchOutboundDeliveries(token) : Promise.resolve({ success: true as const, deliveries: [] }),
    ])
      .then(([profileResponse, rulesResponse, tracesResponse, telegramResponse, outboundStatusResponse, outboundDeliveriesResponse]) => {
        if (!active) return;
        const currentProfile = profileResponse.profile;
        setProfile(currentProfile);
        setRules(rulesResponse.rules);
        setTraces(tracesResponse.traces);
        setTelegramLinks(telegramResponse.links);
        setOutboundStatus(outboundStatusResponse.status);
        setOutboundDeliveries(outboundDeliveriesResponse.deliveries);
        setForm({
          objective: currentProfile.structuredRules.objective,
          tone: currentProfile.structuredRules.tone,
          recommendationPriorities: listToLines(currentProfile.structuredRules.recommendationPriorities),
          evidenceRequirements: listToLines(currentProfile.structuredRules.evidenceRequirements),
          riskPolicy: currentProfile.structuredRules.riskPolicy,
          forbiddenActions: listToLines(currentProfile.structuredRules.forbiddenActions),
          freeformNotes: currentProfile.freeformNotes ?? '',
        });
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la configuracion del agente.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canConfigureAgent, token]);

  const refreshOutboundDeliveries = async () => {
    const response = await fetchOutboundDeliveries(token);
    setOutboundDeliveries(response.deliveries);
  };

  const handleActivateProfile = async () => {
    if (!canConfigureAgent) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await activateAgentProfile(token, {
        structuredRules: {
          objective: form.objective,
          tone: form.tone,
          recommendationPriorities: linesToList(form.recommendationPriorities),
          evidenceRequirements: linesToList(form.evidenceRequirements),
          riskPolicy: form.riskPolicy,
          forbiddenActions: linesToList(form.forbiddenActions),
        },
        freeformNotes: form.freeformNotes,
      });
      setProfile(response.profile);
      setMessage('Perfil del agente activado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo activar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRule = async () => {
    if (!canConfigureAgent) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await createTenantAgentRule(token, {
        category: ruleForm.category,
        ruleText: ruleForm.ruleText,
        priority: Number.parseInt(ruleForm.priority, 10) || 10,
      });
      setRules((current) => [response.rule, ...current]);
      setRuleForm({ category: 'costumbre_cliente', ruleText: '', priority: '10' });
      setMessage('Regla agregada.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo crear la regla.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableRule = async (ruleId: string) => {
    if (!canConfigureAgent) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await disableTenantAgentRule(token, ruleId);
      setRules((current) => current.map((rule) => (rule.id === ruleId ? response.rule : rule)));
      setMessage('Regla desactivada.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo desactivar la regla.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackfill = async () => {
    if (!canConfigureAgent) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await backfillAgentContext(token);
      setMessage(`Contexto reconstruido: ${response.summaries.summaryCount} resumenes actualizados.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo reconstruir el contexto.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTelegramLink = async () => {
    if (!canConfigureAgent) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await createTelegramLink(token, telegramForm);
      setTelegramLinks((current) => [response.link, ...current]);
      setTelegramForm({ email: '', chatId: '', telegramUserId: '', telegramUsername: '' });
      setMessage('Chat de Telegram vinculado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo vincular Telegram.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableTelegramLink = async (linkId: string) => {
    if (!canConfigureAgent) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await disableTelegramLink(token, linkId);
      setTelegramLinks((current) => current.map((link) => (link.id === linkId ? response.link : link)));
      setMessage('Vinculo de Telegram desactivado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo desactivar Telegram.');
    } finally {
      setSaving(false);
    }
  };

  const handleTelegramTestMessage = async (linkId: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await sendTelegramTestMessage(token, linkId);
      await refreshOutboundDeliveries();
      setMessage('Mensaje de prueba enviado por Telegram.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo enviar el mensaje Telegram.');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailTestMessage = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await sendOutboundTestMessage(token, { email: emailTestTarget.trim() || undefined });
      setOutboundDeliveries(response.deliveries);
      setMessage('Prueba de correo registrada.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo enviar el correo de prueba.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendSavingsReminders = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await sendSavingsRemindersNow(token);
      setOutboundDeliveries(response.deliveries);
      setMessage(`Recordatorios procesados para ${response.attemptedUsers ?? 0} usuarios.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudieron enviar recordatorios.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendRecommendationSummary = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await sendRecommendationSummaryNow(token);
      setOutboundDeliveries(response.deliveries);
      setMessage('Resumen de recomendaciones procesado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo enviar el resumen.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm font-bold text-zinc-500">Cargando configuracion del agente...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-tak-yellow">Agente IA</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Gobierno, evidencia y canales externos</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
              El modulo conserva instrucciones, reglas tenant, trazas de IA y entregas por Telegram/correo. El grafo visual fue retirado porque no aportaba evidencia confiable ni ahorro real de tokens.
            </p>
          </div>
          <StatusBadge label={profile?.status ?? 'Sin perfil'} tone={profile?.status === 'ACTIVE' ? 'success' : 'warning'} />
        </div>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-black ${
              activeTab === tab.id ? 'border-tak-yellow bg-tak-yellow text-zinc-950' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {message !== null && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">{message}</p>}
      {error !== null && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</p>}

      {activeTab === 'governance' && (
        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <SectionHeader title="Perfil activo del agente" eyebrow={`Version ${profile?.version ?? '-'}`} icon="psychology" />
            <TextArea label="Objetivo principal" value={form.objective} rows={3} onChange={(value) => setForm((current) => ({ ...current, objective: value }))} />
            <TextArea label="Tono y estilo" value={form.tone} rows={3} onChange={(value) => setForm((current) => ({ ...current, tone: value }))} />
            <TextArea label="Prioridades de recomendacion" value={form.recommendationPriorities} rows={5} onChange={(value) => setForm((current) => ({ ...current, recommendationPriorities: value }))} />
            <TextArea label="Evidencia requerida" value={form.evidenceRequirements} rows={5} onChange={(value) => setForm((current) => ({ ...current, evidenceRequirements: value }))} />
            <TextArea label="Politica de riesgo" value={form.riskPolicy} rows={4} onChange={(value) => setForm((current) => ({ ...current, riskPolicy: value }))} />
            <TextArea label="Acciones prohibidas" value={form.forbiddenActions} rows={4} onChange={(value) => setForm((current) => ({ ...current, forbiddenActions: value }))} />
            <TextArea label="Notas administrativas" value={form.freeformNotes} rows={4} onChange={(value) => setForm((current) => ({ ...current, freeformNotes: value }))} />
            {canConfigureAgent && (
              <button onClick={() => void handleActivateProfile()} disabled={saving} className="rounded-lg bg-tak-yellow px-5 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:opacity-60">
                Activar perfil validado
              </button>
            )}
          </div>

          <div className="space-y-4">
            {canConfigureAgent && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
                <SectionHeader title="Nueva regla tenant" eyebrow="Contexto local" icon="add_task" />
                <Input label="Categoria" value={ruleForm.category} onChange={(value) => setRuleForm((current) => ({ ...current, category: value }))} />
                <Input label="Prioridad" value={ruleForm.priority} onChange={(value) => setRuleForm((current) => ({ ...current, priority: value }))} />
                <TextArea label="Regla del cliente" value={ruleForm.ruleText} rows={5} onChange={(value) => setRuleForm((current) => ({ ...current, ruleText: value }))} />
                <button onClick={() => void handleCreateRule()} disabled={saving} className="w-full rounded-lg bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:opacity-60">
                  Agregar regla
                </button>
              </div>
            )}

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
              <SectionHeader title="Reglas activas" eyebrow="Tenant" icon="rule" />
              {activeRules.length === 0 ? (
                <p className="text-sm font-bold text-zinc-500">No hay reglas activas del cliente.</p>
              ) : (
                activeRules.map((rule) => (
                  <article key={rule.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-tak-yellow">
                      {rule.category} - prioridad {rule.priority}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-200">{rule.ruleText}</p>
                    {canConfigureAgent && (
                      <button onClick={() => void handleDisableRule(rule.id)} disabled={saving} className="mt-3 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-400 hover:text-white disabled:opacity-60">
                        Desactivar
                      </button>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'evidence' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AgentMetric title="Trazas registradas" value={traces.length} helper={`${errorTraceCount} con alerta`} icon="query_stats" />
            <AgentMetric title="Tokens estimados" value={totalTraceTokens} helper="Prompt + respuesta" icon="data_usage" />
            <AgentMetric title="Entregas externas" value={outboundDeliveries.length} helper="Ultimos eventos" icon="outgoing_mail" />
            <AgentMetric
              title="Ultima operacion"
              value={latestTrace !== undefined ? operationLabels[latestTrace.operation] : 'Sin uso'}
              helper={latestTrace !== undefined ? new Date(latestTrace.createdAt).toLocaleDateString('es-CO') : 'Pendiente'}
              icon="schedule"
            />
          </div>
          <TraceTable traces={traces} />
        </section>
      )}

      {activeTab === 'channels' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <AgentMetric title="Telegram" value={outboundStatus?.telegram.enabled ? 'Activo' : 'Inactivo'} helper={`${activeTelegramLinks} chats activos`} icon="send" />
            <AgentMetric title="Correo SMTP" value={outboundStatus?.email.enabled ? 'Activo' : 'Inactivo'} helper={outboundStatus?.email.smtpConfigured ? 'Configurado' : 'Pendiente .env'} icon="mail" />
            <AgentMetric title="Permisos" value={canConfigureAgent ? 'Administracion' : 'Lectura'} helper={role} icon="admin_panel_settings" />
          </div>

          <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <SectionHeader title="Envios manuales" eyebrow="Telegram y correo" icon="campaign" />
              {canConfigureAgent && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button onClick={() => void handleSendSavingsReminders()} disabled={saving} className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-200 hover:border-tak-yellow hover:text-tak-yellow disabled:opacity-60">
                    Recordar ahorro pendiente
                  </button>
                  <button onClick={() => void handleSendRecommendationSummary()} disabled={saving} className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-200 hover:border-tak-yellow hover:text-tak-yellow disabled:opacity-60">
                    Enviar resumen IA
                  </button>
                  <button onClick={() => void handleBackfill()} disabled={saving} className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-200 hover:border-tak-yellow hover:text-tak-yellow disabled:opacity-60">
                    Reconstruir contexto
                  </button>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Los envios quedan auditados como entregas. El scheduler opcional usa las mismas rutas internas y puede activarse desde variables de entorno.
            </p>
          </section>

          {canConfigureAgent ? (
            <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
              <div className="space-y-4">
                <EmailPanel email={emailTestTarget} saving={saving} onEmailChange={setEmailTestTarget} onSend={() => void handleEmailTestMessage()} />
                <TelegramPanel
                  links={telegramLinks}
                  form={telegramForm}
                  saving={saving}
                  onFormChange={setTelegramForm}
                  onCreate={() => void handleCreateTelegramLink()}
                  onDisable={(linkId) => void handleDisableTelegramLink(linkId)}
                  onTest={(linkId) => void handleTelegramTestMessage(linkId)}
                />
              </div>
              <DeliveryTable deliveries={outboundDeliveries} />
            </div>
          ) : (
            <ReadOnlyNotice text="La gestion de canales externos esta reservada para administradores." />
          )}
        </section>
      )}
    </div>
  );
}

function AgentMetric({ title, value, helper, icon }: { readonly title: string; readonly value: string | number; readonly helper: string; readonly icon: string }) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{title}</p>
          <p className="mt-2 text-2xl font-black text-white break-words">{value}</p>
          <p className="mt-1 text-xs font-bold text-zinc-500 break-words">{helper}</p>
        </div>
        <span className="material-symbols-outlined text-xl text-tak-yellow">{icon}</span>
      </div>
    </article>
  );
}

function SectionHeader({ title, eyebrow, icon }: { readonly title: string; readonly eyebrow: string; readonly icon: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined mt-0.5 text-xl text-tak-yellow">{icon}</span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{eyebrow}</p>
        <h3 className="mt-1 text-base font-black text-white">{title}</h3>
      </div>
    </div>
  );
}

function StatusBadge({ label, tone }: { readonly label: string; readonly tone: 'success' | 'warning' }) {
  const classes = tone === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200';
  return <span className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-widest ${classes}`}>{label}</span>;
}

function ReadOnlyNotice({ text }: { readonly text: string }) {
  return <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-200">{text}</div>;
}

function TraceTable({ traces }: { readonly traces: readonly AiContextTrace[] }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="border-b border-zinc-800 px-5 py-4">
        <SectionHeader title="Trazas de contexto IA" eyebrow="Observabilidad" icon="manage_search" />
      </div>
      <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-zinc-800 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 md:grid">
        <span>Operacion</span>
        <span>Modelo</span>
        <span>Estado</span>
        <span>Tokens</span>
        <span>Fecha</span>
      </div>
      {traces.length === 0 ? (
        <p className="px-4 py-6 text-sm font-bold text-zinc-500">Aun no hay trazas de contexto.</p>
      ) : (
        traces.map((trace) => (
          <div key={trace.id} className="grid gap-2 border-b border-zinc-800 px-4 py-3 text-xs text-zinc-300 last:border-b-0 md:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr] md:gap-3">
            <span className="font-bold text-white">{operationLabels[trace.operation]}</span>
            <span className="truncate">{trace.model}</span>
            <span className={trace.status === 'SUCCESS' ? 'text-emerald-300' : 'text-red-300'}>{trace.status}</span>
            <span>{trace.promptTokenEstimate + (trace.responseTokenEstimate ?? 0)}</span>
            <span>{new Date(trace.createdAt).toLocaleDateString('es-CO')}</span>
          </div>
        ))
      )}
    </section>
  );
}

function Input({ label, value, onChange }: { readonly label: string; readonly value: string; readonly onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm font-bold text-zinc-100 outline-none focus:border-tak-yellow" />
    </label>
  );
}

function TextArea({ label, value, rows, onChange }: { readonly label: string; readonly value: string; readonly rows: number; readonly onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm font-bold leading-relaxed text-zinc-100 outline-none focus:border-tak-yellow"
      />
    </label>
  );
}

function EmailPanel({
  email,
  saving,
  onEmailChange,
  onSend,
}: {
  readonly email: string;
  readonly saving: boolean;
  readonly onEmailChange: (value: string) => void;
  readonly onSend: () => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
      <SectionHeader title="Correo SMTP" eyebrow="Prueba manual" icon="mail" />
      <Input label="Email destino opcional" value={email} onChange={onEmailChange} />
      <button onClick={onSend} disabled={saving} className="w-full rounded-lg bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:opacity-60">
        Enviar prueba de correo
      </button>
    </section>
  );
}

function TelegramPanel({
  links,
  form,
  saving,
  onFormChange,
  onCreate,
  onDisable,
  onTest,
}: {
  readonly links: readonly TelegramChatLink[];
  readonly form: { readonly email: string; readonly chatId: string; readonly telegramUserId: string; readonly telegramUsername: string };
  readonly saving: boolean;
  readonly onFormChange: (form: { readonly email: string; readonly chatId: string; readonly telegramUserId: string; readonly telegramUsername: string }) => void;
  readonly onCreate: () => void;
  readonly onDisable: (linkId: string) => void;
  readonly onTest: (linkId: string) => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
      <SectionHeader title="Telegram" eyebrow="Vinculacion" icon="send" />
      <Input label="Email usuario FinOps" value={form.email} onChange={(value) => onFormChange({ ...form, email: value })} />
      <Input label="Chat ID" value={form.chatId} onChange={(value) => onFormChange({ ...form, chatId: value })} />
      <Input label="Telegram user ID" value={form.telegramUserId} onChange={(value) => onFormChange({ ...form, telegramUserId: value })} />
      <Input label="Username" value={form.telegramUsername} onChange={(value) => onFormChange({ ...form, telegramUsername: value })} />
      <button onClick={onCreate} disabled={saving} className="w-full rounded-lg bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:opacity-60">
        Vincular chat
      </button>

      <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
        {links.length === 0 ? (
          <p className="p-4 text-sm font-bold text-zinc-500">No hay chats de Telegram vinculados.</p>
        ) : (
          links.map((link) => (
            <article key={link.id} className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white">{link.user?.email ?? link.userId}</p>
                  <p className="mt-1 text-xs font-mono text-zinc-500 break-all">{link.chatId}</p>
                  <StatusBadge label={link.status} tone={link.status === 'ACTIVE' ? 'success' : 'warning'} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onTest(link.id)} disabled={saving || link.status !== 'ACTIVE'} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white disabled:opacity-50">
                    Probar
                  </button>
                  <button onClick={() => onDisable(link.id)} disabled={saving || link.status !== 'ACTIVE'} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-400 hover:text-white disabled:opacity-50">
                    Desactivar
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function DeliveryTable({ deliveries }: { readonly deliveries: readonly OutboundMessageDelivery[] }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="border-b border-zinc-800 px-5 py-4">
        <SectionHeader title="Entregas recientes" eyebrow="Auditoria de mensajes" icon="receipt_long" />
      </div>
      <div className="hidden grid-cols-[0.8fr_1fr_0.8fr_1.4fr_0.8fr] gap-3 border-b border-zinc-800 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 md:grid">
        <span>Canal</span>
        <span>Tipo</span>
        <span>Estado</span>
        <span>Vista previa</span>
        <span>Fecha</span>
      </div>
      {deliveries.length === 0 ? (
        <p className="px-4 py-6 text-sm font-bold text-zinc-500">Aun no hay entregas registradas.</p>
      ) : (
        deliveries.map((delivery) => (
          <div key={delivery.id} className="grid gap-2 border-b border-zinc-800 px-4 py-3 text-xs text-zinc-300 last:border-b-0 md:grid-cols-[0.8fr_1fr_0.8fr_1.4fr_0.8fr] md:gap-3">
            <span className="font-black text-white">{delivery.channel}</span>
            <span>{delivery.messageType}</span>
            <span className={delivery.status === 'SENT' ? 'text-emerald-300' : delivery.status === 'FAILED' ? 'text-red-300' : 'text-yellow-300'}>{delivery.status}</span>
            <span className="truncate" title={delivery.errorMessage ?? delivery.preview}>
              {delivery.errorMessage ?? delivery.preview}
            </span>
            <span>{new Date(delivery.createdAt).toLocaleDateString('es-CO')}</span>
          </div>
        ))
      )}
    </section>
  );
}
