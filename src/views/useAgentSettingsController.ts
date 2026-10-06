import { useEffect, useMemo, useState } from 'react';
import { useAccessToken } from '../auth/authSession';
import { canManageOutboundChannels } from '../components/navigation';
import {
  activateAgentProfile,
  backfillAgentContext,
  createTelegramLink,
  createTenantAgentRule,
  deactivateAiLearningMemory,
  disableTelegramLink,
  disableTenantAgentRule,
  fetchAgentProfile,
  fetchAiContextTraces,
  fetchAiQualityReport,
  fetchAiLearningSummary,
  fetchOutboundChannelStatus,
  fetchOutboundDeliveries,
  fetchTelegramLinks,
  fetchTenantAgentRules,
  sendOutboundTestMessage,
  sendRecommendationSummaryNow,
  sendExecutiveSummaryNow,
  sendSavingsRemindersNow,
  sendTelegramTestMessage,
  type AgentInstructionProfile,
  type AgentInstructionRules,
  type AiContextTrace,
  type AgentQualityReport,
  type AgentLearningSummaryResponse,
  type ApiRole,
  type OutboundChannelStatusResponse,
  type OutboundMessageDelivery,
  type TenantAgentRule,
  type TelegramChatLink,
} from '../services/api';

const defaultRules: AgentInstructionRules = {
  objective: 'Generar recomendaciones FinOps accionables, auditables y realistas para el tenant activo.',
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

function linesToList(value: string): readonly string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

function listToLines(value: readonly string[]): string {
  return value.join('\n');
}

export function useAgentSettingsController(role: ApiRole) {
  const token = useAccessToken();
  const canConfigureAgent = role === 'ADMIN' || role === 'MASTER_ADMIN' || role === 'OPERATOR_ADMIN' || role === 'LEAD_TECHNICIAN';
  const canManageOutbound = canManageOutboundChannels(role);
  const analysisOnly = role === 'VIEWER' || role === 'CLIENT_APPROVER' || role === 'CLIENT_VIEWER';
  const [profile, setProfile] = useState<AgentInstructionProfile | null>(null);
  const [rules, setRules] = useState<readonly TenantAgentRule[]>([]);
  const [traces, setTraces] = useState<readonly AiContextTrace[]>([]);
  const [qualityReport, setQualityReport] = useState<AgentQualityReport | null>(null);
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
      fetchAiQualityReport(token),
      fetchAiLearningSummary(token),
      canManageOutbound ? fetchTelegramLinks(token) : Promise.resolve({ success: true as const, links: [] }),
      canManageOutbound ? fetchOutboundChannelStatus(token) : Promise.resolve({ success: true as const, status: null }),
      canManageOutbound ? fetchOutboundDeliveries(token) : Promise.resolve({ success: true as const, deliveries: [] }),
    ])
      .then(([profileResponse, rulesResponse, tracesResponse, qualityResponse, learningResponse, telegramResponse, outboundStatusResponse, outboundDeliveriesResponse]) => {
        if (!active) return;
        const currentProfile = profileResponse.profile;
        setProfile(currentProfile);
        setRules(rulesResponse.rules);
        setTraces(tracesResponse.traces);
        setQualityReport(qualityResponse.report);
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
        if (active) setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la configuracion del agente.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [analysisOnly, canConfigureAgent, canManageOutbound, token]);

  const runAction = async (action: () => Promise<void>, fallback: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : fallback);
    } finally {
      setSaving(false);
    }
  };

  const refreshOutboundDeliveries = async () => {
    const response = await fetchOutboundDeliveries(token);
    setOutboundDeliveries(response.deliveries);
  };

  const handleActivateProfile = () => runAction(async () => {
    if (!canConfigureAgent) return;
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
  }, 'No se pudo activar el perfil.');

  const handleCreateRule = () => runAction(async () => {
    if (!canConfigureAgent) return;
    const response = await createTenantAgentRule(token, {
      category: ruleForm.category,
      ruleText: ruleForm.ruleText,
      priority: Number.parseInt(ruleForm.priority, 10) || 10,
    });
    setRules((current) => [response.rule, ...current]);
    setRuleForm({ category: 'costumbre_cliente', ruleText: '', priority: '10' });
    setMessage('Regla agregada.');
  }, 'No se pudo crear la regla.');

  const handleDisableRule = (ruleId: string) => runAction(async () => {
    if (!canConfigureAgent) return;
    const response = await disableTenantAgentRule(token, ruleId);
    setRules((current) => current.map((rule) => (rule.id === ruleId ? response.rule : rule)));
    setMessage('Regla desactivada.');
  }, 'No se pudo desactivar la regla.');

  const handleBackfill = () => runAction(async () => {
    if (!canConfigureAgent) return;
    const response = await backfillAgentContext(token);
    setMessage(`Contexto reconstruido: ${response.summaries.summaryCount} resumenes actualizados.`);
  }, 'No se pudo reconstruir el contexto.');

  const handleDeactivateMemory = (memoryId: string) => runAction(async () => {
    if (!canConfigureAgent || learningSummary === null) return;
    await deactivateAiLearningMemory(token, memoryId);
    setLearningSummary((current) => current === null ? current : {
      ...current,
      memories: current.memories.filter((memory) => memory.id !== memoryId),
      stats: { ...current.stats, activeMemories: Math.max(0, current.stats.activeMemories - 1) },
    });
    setMessage('Memoria revertida. Se conserva el evento histórico de aprendizaje.');
  }, 'No se pudo revertir la memoria.');

  const handleCreateTelegramLink = () => runAction(async () => {
    if (!canManageOutbound) return;
    const response = await createTelegramLink(token, telegramForm);
    setTelegramLinks((current) => [response.link, ...current]);
    setTelegramForm({ email: '', chatId: '', telegramUserId: '', telegramUsername: '' });
    setMessage('Chat de Telegram vinculado.');
  }, 'No se pudo vincular Telegram.');

  const handleDisableTelegramLink = (linkId: string) => runAction(async () => {
    if (!canManageOutbound) return;
    const response = await disableTelegramLink(token, linkId);
    setTelegramLinks((current) => current.map((link) => (link.id === linkId ? response.link : link)));
    setMessage('Vinculo de Telegram desactivado.');
  }, 'No se pudo desactivar Telegram.');

  const handleTelegramTestMessage = (linkId: string) => runAction(async () => {
    if (!canManageOutbound) return;
    await sendTelegramTestMessage(token, linkId);
    await refreshOutboundDeliveries();
    setMessage('Mensaje de prueba enviado por Telegram.');
  }, 'No se pudo enviar el mensaje Telegram.');

  const handleEmailTestMessage = () => runAction(async () => {
    if (!canManageOutbound) return;
    const response = await sendOutboundTestMessage(token, { email: emailTestTarget.trim() || undefined });
    setOutboundDeliveries(response.deliveries);
    setMessage('Prueba de correo registrada.');
  }, 'No se pudo enviar el correo de prueba.');

  const handleSendSavingsReminders = () => runAction(async () => {
    if (!canManageOutbound) return;
    const response = await sendSavingsRemindersNow(token);
    setOutboundDeliveries(response.deliveries);
    setMessage(`Recordatorios procesados para ${response.attemptedUsers ?? 0} usuarios.`);
  }, 'No se pudieron enviar recordatorios.');

  const handleSendRecommendationSummary = () => runAction(async () => {
    if (!canManageOutbound) return;
    const response = await sendRecommendationSummaryNow(token);
    setOutboundDeliveries(response.deliveries);
    setMessage('Resumen de recomendaciones procesado.');
  }, 'No se pudo enviar el resumen.');

  const handleSendExecutiveSummary = () => runAction(async () => {
    if (!canManageOutbound) return;
    const response = await sendExecutiveSummaryNow(token);
    setOutboundDeliveries(response.deliveries);
    setMessage('Resumen ejecutivo FinOps encolado para correo y Telegram.');
  }, 'No se pudo enviar el resumen ejecutivo.');

  return {
    analysisOnly,
    canConfigureAgent,
    canManageOutbound,
    profile,
    rules,
    activeRules,
    traces,
    qualityReport,
    learningSummary,
    telegramLinks,
    activeTelegramLinks,
    outboundStatus,
    outboundDeliveries,
    form,
    ruleForm,
    telegramForm,
    emailTestTarget,
    loading,
    saving,
    message,
    error,
    setForm,
    setRuleForm,
    setTelegramForm,
    setEmailTestTarget,
    handleActivateProfile,
    handleCreateRule,
    handleDisableRule,
    handleBackfill,
    handleDeactivateMemory,
    handleCreateTelegramLink,
    handleDisableTelegramLink,
    handleTelegramTestMessage,
    handleEmailTestMessage,
    handleSendSavingsReminders,
    handleSendRecommendationSummary,
    handleSendExecutiveSummary,
  };
}
