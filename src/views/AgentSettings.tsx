import { useEffect, useMemo, useState } from 'react';
import RecommendationAnalysisRunsPanel from '../components/RecommendationAnalysisRunsPanel';
import { AgentSettingsChannels } from '../components/agent/AgentSettingsChannels';
import { AgentSettingsEvidence } from '../components/agent/AgentSettingsEvidence';
import { AgentSettingsGovernance } from '../components/agent/AgentSettingsGovernance';
import { StatusBadge } from '../components/agent/AgentSettingsUi';
import {
  activateAgentProfile,
  backfillAgentContext,
  createTelegramLink,
  createTenantAgentRule,
  disableTelegramLink,
  disableTenantAgentRule,
  fetchAgentProfile,
  fetchAiContextTraces,
  fetchAiLearningSummary,
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
  type AgentLearningSummaryResponse,
  type ApiRole,
  type OutboundChannelStatusResponse,
  type OutboundMessageDelivery,
  type TenantAgentRule,
  type TelegramChatLink,
} from '../services/api';

interface AgentSettingsProps {
  readonly token: string;
  readonly role: ApiRole;
  readonly onOpenRecommendation?: (recommendationId: string) => void;
}
type Tab = 'analysis' | 'governance' | 'evidence' | 'channels';

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
  { id: 'analysis', label: 'Análisis', icon: 'model_training' },
  { id: 'governance', label: 'Gobierno', icon: 'admin_panel_settings' },
  { id: 'evidence', label: 'Evidencia', icon: 'manage_search' },
  { id: 'channels', label: 'Canales', icon: 'settings_input_component' },
];

function linesToList(value: string): readonly string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(value: readonly string[]): string {
  return value.join('\n');
}

export default function AgentSettings({ token, role, onOpenRecommendation }: AgentSettingsProps) {
  const canConfigureAgent = role === 'ADMIN' || role === 'MASTER_ADMIN' || role === 'OPERATOR_ADMIN';
  const analysisOnly = role === 'VIEWER' || role === 'CLIENT_APPROVER' || role === 'CLIENT_VIEWER';
  const [activeTab, setActiveTab] = useState<Tab>('analysis');
  const [profile, setProfile] = useState<AgentInstructionProfile | null>(null);
  const [rules, setRules] = useState<readonly TenantAgentRule[]>([]);
  const [traces, setTraces] = useState<readonly AiContextTrace[]>([]);
  const [learningSummary, setLearningSummary] = useState<AgentLearningSummaryResponse['learning'] | null>(null);
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
  const activeTelegramLinks = telegramLinks.filter((link) => link.status === 'ACTIVE').length;

  useEffect(() => {
    if (analysisOnly) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchAgentProfile(token),
      fetchTenantAgentRules(token),
      fetchAiContextTraces(token),
      fetchAiLearningSummary(token),
      canConfigureAgent ? fetchTelegramLinks(token) : Promise.resolve({ success: true as const, links: [] }),
      canConfigureAgent ? fetchOutboundChannelStatus(token) : Promise.resolve({ success: true as const, status: null }),
      canConfigureAgent ? fetchOutboundDeliveries(token) : Promise.resolve({ success: true as const, deliveries: [] }),
    ])
      .then(([profileResponse, rulesResponse, tracesResponse, learningResponse, telegramResponse, outboundStatusResponse, outboundDeliveriesResponse]) => {
        if (!active) return;
        const currentProfile = profileResponse.profile;
        setProfile(currentProfile);
        setRules(rulesResponse.rules);
        setTraces(tracesResponse.traces);
        setLearningSummary(learningResponse.learning);
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
  }, [analysisOnly, canConfigureAgent, token]);

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
        {(analysisOnly ? tabs.slice(0, 1) : tabs).map((tab) => (
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

      {activeTab === 'analysis' && (
        <RecommendationAnalysisRunsPanel
          token={token}
          role={role}
          onOpenRecommendation={onOpenRecommendation}
        />
      )}

      {activeTab === 'governance' && (
        <AgentSettingsGovernance
          canConfigureAgent={canConfigureAgent}
          saving={saving}
          profile={profile}
          form={form}
          ruleForm={ruleForm}
          activeRules={activeRules}
          onFormChange={setForm}
          onRuleFormChange={setRuleForm}
          onActivateProfile={() => void handleActivateProfile()}
          onCreateRule={() => void handleCreateRule()}
          onDisableRule={(ruleId) => void handleDisableRule(ruleId)}
        />
      )}

      {activeTab === 'evidence' && (
        <AgentSettingsEvidence traces={traces} learningSummary={learningSummary} outboundDeliveryCount={outboundDeliveries.length} />
      )}

      {activeTab === 'channels' && (
        <AgentSettingsChannels
          canConfigureAgent={canConfigureAgent}
          saving={saving}
          outboundStatus={outboundStatus}
          activeTelegramLinks={activeTelegramLinks}
          outboundDeliveries={outboundDeliveries}
          emailTestTarget={emailTestTarget}
          telegramLinks={telegramLinks}
          telegramForm={telegramForm}
          onEmailChange={setEmailTestTarget}
          onSendEmail={() => void handleEmailTestMessage()}
          onTelegramFormChange={setTelegramForm}
          onCreateTelegram={() => void handleCreateTelegramLink()}
          onDisableTelegram={(linkId) => void handleDisableTelegramLink(linkId)}
          onTestTelegram={(linkId) => void handleTelegramTestMessage(linkId)}
          onSendSavingsReminders={() => void handleSendSavingsReminders()}
          onSendRecommendationSummary={() => void handleSendRecommendationSummary()}
          onBackfill={() => void handleBackfill()}
        />
      )}
    </div>
  );
}

