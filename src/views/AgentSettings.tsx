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
  fetchKnowledgeGraph,
  fetchTelegramLinks,
  fetchTenantAgentRules,
  sendTelegramTestMessage,
  type AgentInstructionProfile,
  type AgentInstructionRules,
  type AiContextTrace,
  type KnowledgeGraphEdge,
  type KnowledgeGraphNode,
  type TenantAgentRule,
  type TelegramChatLink,
} from '../services/api';

interface AgentSettingsProps {
  token: string;
}

type Tab = 'instructions' | 'rules' | 'observability' | 'graph' | 'telegram';

const defaultRules: AgentInstructionRules = {
  objective: 'Generar recomendaciones FinOps accionables, auditables y realistas para FinOps Demo.',
  tone: 'Español claro, técnico cuando haga falta, enfocado en ahorro, riesgo y evidencia.',
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
  forbiddenActions: [
    'Ignorar auditoria IA.',
    'Exponer credenciales, tokens o secretos.',
    'Ejecutar cambios de infraestructura automaticamente.',
  ],
};

const tabs: readonly { id: Tab; label: string; icon: string }[] = [
  { id: 'instructions', label: 'Instrucciones', icon: 'tune' },
  { id: 'rules', label: 'Reglas', icon: 'rule' },
  { id: 'observability', label: 'Trazas', icon: 'monitoring' },
  { id: 'graph', label: 'Grafo', icon: 'hub' },
  { id: 'telegram', label: 'Telegram', icon: 'send' },
];

const operationLabels: Record<AiContextTrace['operation'], string> = {
  CHAT: 'Chat',
  RECOMMENDATION: 'Recomendaciones',
  EXECUTION_PLAN: 'Plan',
  AUDIT: 'Auditoria',
  LEARNING: 'Aprendizaje',
};

function linesToList(value: string): readonly string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

function listToLines(value: readonly string[]): string {
  return value.join('\n');
}

export default function AgentSettings({ token }: AgentSettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('instructions');
  const [profile, setProfile] = useState<AgentInstructionProfile | null>(null);
  const [rules, setRules] = useState<readonly TenantAgentRule[]>([]);
  const [traces, setTraces] = useState<readonly AiContextTrace[]>([]);
  const [graphNodes, setGraphNodes] = useState<readonly KnowledgeGraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<readonly KnowledgeGraphEdge[]>([]);
  const [telegramLinks, setTelegramLinks] = useState<readonly TelegramChatLink[]>([]);
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | null>(null);
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
  const [graphQuery, setGraphQuery] = useState({ recommendationId: '', resourceId: '' });
  const [telegramForm, setTelegramForm] = useState({ email: '', chatId: '', telegramUserId: '', telegramUsername: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeRules = useMemo(
    () => rules.filter((rule) => rule.status === 'ACTIVE').sort((a, b) => b.priority - a.priority),
    [rules],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchAgentProfile(token),
      fetchTenantAgentRules(token),
      fetchAiContextTraces(token),
      fetchTelegramLinks(token),
    ])
      .then(([profileResponse, rulesResponse, tracesResponse, telegramResponse]) => {
        if (!active) return;
        const currentProfile = profileResponse.profile;
        setProfile(currentProfile);
        setRules(rulesResponse.rules);
        setTraces(tracesResponse.traces);
        setTelegramLinks(telegramResponse.links);
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
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleActivateProfile = async () => {
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
        ...(form.freeformNotes.trim().length > 0 ? { freeformNotes: form.freeformNotes } : {}),
      });

      setProfile(response.profile);
      setMessage(`Perfil activo version ${response.profile.version}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo activar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRule = async () => {
    if (ruleForm.ruleText.trim().length === 0) {
      setError('La regla no puede estar vacia.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await createTenantAgentRule(token, {
        category: ruleForm.category,
        ruleText: ruleForm.ruleText,
        priority: Number(ruleForm.priority),
      });

      setRules((current) => [response.rule, ...current]);
      setRuleForm((current) => ({ ...current, ruleText: '' }));
      setMessage('Regla agregada al contexto del agente.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo crear la regla.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableRule = async (ruleId: string) => {
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
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await backfillAgentContext(token);
      setMessage(`Contexto reconstruido: ${response.summaries.summaryCount} resumenes, ${response.graph.nodeCount} nodos y ${response.graph.edgeCount} relaciones.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo reconstruir el contexto.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadGraph = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetchKnowledgeGraph(token, graphQuery);
      setGraphNodes(response.graph.nodes);
      setGraphEdges(response.graph.edges);
      setSelectedGraphNodeId(response.graph.nodes[0]?.id ?? null);
      setMessage(`Grafo cargado: ${response.graph.nodes.length} nodos y ${response.graph.edges.length} relaciones.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el grafo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTelegramLink = async () => {
    if (telegramForm.email.trim() === '' || telegramForm.chatId.trim() === '') {
      setError('Email y Chat ID son obligatorios para vincular Telegram.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await createTelegramLink(token, {
        email: telegramForm.email.trim(),
        chatId: telegramForm.chatId.trim(),
        ...(telegramForm.telegramUserId.trim() !== '' ? { telegramUserId: telegramForm.telegramUserId.trim() } : {}),
        ...(telegramForm.telegramUsername.trim() !== '' ? { telegramUsername: telegramForm.telegramUsername.trim() } : {}),
      });

      setTelegramLinks((current) => [
        response.link,
        ...current.filter((link) => link.id !== response.link.id && link.chatId !== response.link.chatId),
      ]);
      setTelegramForm({ email: '', chatId: '', telegramUserId: '', telegramUsername: '' });
      setMessage('Chat de Telegram vinculado correctamente.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo vincular Telegram.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableTelegramLink = async (linkId: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await disableTelegramLink(token, linkId);
      setTelegramLinks((current) => current.map((link) => (link.id === linkId ? response.link : link)));
      setMessage('Vinculo Telegram desactivado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo desactivar el vinculo Telegram.');
    } finally {
      setSaving(false);
    }
  };

  const handleTelegramTestMessage = async (linkId: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await sendTelegramTestMessage(token, linkId);
      setTelegramLinks((current) => current.map((link) => (link.id === linkId ? response.link : link)));
      setMessage('Mensaje de prueba enviado por Telegram.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo enviar el mensaje de prueba.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm font-bold text-zinc-500">Cargando configuracion del agente...</p>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-tak-yellow">Gobierno del agente</p>
          <h2 className="text-3xl font-black text-white mt-1">Configuracion IA FinOps</h2>
          <p className="text-sm text-zinc-400 mt-2 max-w-3xl">
            Administra el perfil global TAK, reglas de cliente, trazas de contexto y grafo de conocimiento que usa el agente para responder.
          </p>
        </div>
        <button
          onClick={() => void handleBackfill()}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-tak-yellow/40 bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          Reconstruir contexto
        </button>
      </section>

      {(message !== null || error !== null) && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${error !== null ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-tak-yellow/30 bg-tak-yellow/10 text-tak-yellow'}`}>
          {error ?? message}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition ${
              activeTab === tab.id
                ? 'border-tak-yellow text-tak-yellow'
                : 'border-transparent text-zinc-500 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'instructions' && (
        <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <TextArea label="Objetivo principal" value={form.objective} rows={3} onChange={(value) => setForm((current) => ({ ...current, objective: value }))} />
            <TextArea label="Tono y estilo" value={form.tone} rows={3} onChange={(value) => setForm((current) => ({ ...current, tone: value }))} />
            <TextArea label="Prioridades de recomendacion" value={form.recommendationPriorities} rows={5} onChange={(value) => setForm((current) => ({ ...current, recommendationPriorities: value }))} />
            <TextArea label="Evidencia requerida" value={form.evidenceRequirements} rows={5} onChange={(value) => setForm((current) => ({ ...current, evidenceRequirements: value }))} />
            <TextArea label="Politica de riesgo" value={form.riskPolicy} rows={4} onChange={(value) => setForm((current) => ({ ...current, riskPolicy: value }))} />
            <TextArea label="Acciones prohibidas" value={form.forbiddenActions} rows={4} onChange={(value) => setForm((current) => ({ ...current, forbiddenActions: value }))} />
            <TextArea label="Notas administrativas" value={form.freeformNotes} rows={4} onChange={(value) => setForm((current) => ({ ...current, freeformNotes: value }))} />
            <button
              onClick={() => void handleActivateProfile()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-tak-yellow px-5 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-lg">verified</span>
              Activar perfil validado
            </button>
          </div>

          <aside className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 h-fit">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Perfil activo</p>
            <p className="mt-3 text-4xl font-black text-white">v{profile?.version ?? 0}</p>
            <p className="mt-2 text-sm font-bold text-tak-yellow">{profile?.status ?? 'ACTIVE'}</p>
            <p className="mt-4 text-xs leading-relaxed text-zinc-400">
              Las reglas globales pasan validacion antes de activarse. Si el texto intenta saltarse auditoria, exponer secretos o automatizar cambios, el backend lo rechaza.
            </p>
          </aside>
        </section>
      )}

      {activeTab === 'rules' && (
        <section className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 h-fit">
            <Input label="Categoria" value={ruleForm.category} onChange={(value) => setRuleForm((current) => ({ ...current, category: value }))} />
            <Input label="Prioridad" value={ruleForm.priority} onChange={(value) => setRuleForm((current) => ({ ...current, priority: value }))} />
            <TextArea label="Regla del cliente" value={ruleForm.ruleText} rows={6} onChange={(value) => setRuleForm((current) => ({ ...current, ruleText: value }))} />
            <button
              onClick={() => void handleCreateRule()}
              disabled={saving}
              className="w-full rounded-lg bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Agregar regla
            </button>
          </div>

          <div className="space-y-3">
            {activeRules.length === 0 ? (
              <p className="rounded-lg border border-zinc-800 p-5 text-sm font-bold text-zinc-500">No hay reglas activas del cliente.</p>
            ) : activeRules.map((rule) => (
              <article key={rule.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-tak-yellow">{rule.category} · prioridad {rule.priority}</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-200">{rule.ruleText}</p>
                  </div>
                  <button
                    onClick={() => void handleDisableRule(rule.id)}
                    disabled={saving}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-400 hover:text-white disabled:opacity-60"
                  >
                    Desactivar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'observability' && (
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-zinc-800 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <span>Operacion</span>
            <span>Modelo</span>
            <span>Estado</span>
            <span>Tokens</span>
            <span>Fecha</span>
          </div>
          {traces.length === 0 ? (
            <p className="px-4 py-6 text-sm font-bold text-zinc-500">Aun no hay trazas de contexto.</p>
          ) : traces.map((trace) => (
            <div key={trace.id} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-zinc-800 px-4 py-3 text-xs text-zinc-300 last:border-b-0">
              <span className="font-bold text-white">{operationLabels[trace.operation]}</span>
              <span className="truncate">{trace.model}</span>
              <span className={trace.status === 'SUCCESS' ? 'text-emerald-300' : 'text-red-300'}>{trace.status}</span>
              <span>{trace.promptTokenEstimate + (trace.responseTokenEstimate ?? 0)}</span>
              <span>{new Date(trace.createdAt).toLocaleDateString('es-CO')}</span>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'graph' && (
        <section className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <Input label="ID recomendacion" value={graphQuery.recommendationId} onChange={(value) => setGraphQuery((current) => ({ ...current, recommendationId: value }))} />
            <Input label="ID recurso" value={graphQuery.resourceId} onChange={(value) => setGraphQuery((current) => ({ ...current, resourceId: value }))} />
            <button
              onClick={() => void handleLoadGraph()}
              disabled={saving}
              className="self-end rounded-lg bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {graphQuery.recommendationId.trim() === '' && graphQuery.resourceId.trim() === '' ? 'Ver grafo completo' : 'Ver grafo filtrado'}
            </button>
            <p className="lg:col-span-3 text-xs font-bold text-zinc-500">
              Deja ambos campos vacios para cargar el grafo completo del tenant. Usa ID de recomendacion o recurso solo cuando quieras un contexto acotado.
            </p>
          </div>

          <KnowledgeGraphVisual
            nodes={graphNodes}
            edges={graphEdges}
            selectedNodeId={selectedGraphNodeId}
            onSelectNode={setSelectedGraphNodeId}
          />
        </section>
      )}

      {activeTab === 'telegram' && (
        <TelegramPanel
          links={telegramLinks}
          form={telegramForm}
          saving={saving}
          onFormChange={setTelegramForm}
          onCreate={() => void handleCreateTelegramLink()}
          onDisable={(linkId) => void handleDisableTelegramLink(linkId)}
          onTest={(linkId) => void handleTelegramTestMessage(linkId)}
        />
      )}
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm font-bold text-zinc-100 outline-none focus:border-tak-yellow"
      />
    </label>
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
  readonly form: {
    readonly email: string;
    readonly chatId: string;
    readonly telegramUserId: string;
    readonly telegramUsername: string;
  };
  readonly saving: boolean;
  readonly onFormChange: (form: { readonly email: string; readonly chatId: string; readonly telegramUserId: string; readonly telegramUsername: string }) => void;
  readonly onCreate: () => void;
  readonly onDisable: (linkId: string) => void;
  readonly onTest: (linkId: string) => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 h-fit">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-tak-yellow">Vinculacion Telegram</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            El usuario debe enviar <span className="font-mono text-zinc-100">/start</span> al bot y copiar el Chat ID que recibe. Luego un administrador lo vincula aqui con su email FinOps.
          </p>
        </div>
        <Input label="Email usuario FinOps" value={form.email} onChange={(value) => onFormChange({ ...form, email: value })} />
        <Input label="Chat ID Telegram" value={form.chatId} onChange={(value) => onFormChange({ ...form, chatId: value })} />
        <Input label="Telegram User ID opcional" value={form.telegramUserId} onChange={(value) => onFormChange({ ...form, telegramUserId: value })} />
        <Input label="Username opcional" value={form.telegramUsername} onChange={(value) => onFormChange({ ...form, telegramUsername: value })} />
        <button
          onClick={onCreate}
          disabled={saving}
          className="w-full rounded-lg bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Vincular chat
        </button>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="border-b border-zinc-800 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-widest text-tak-yellow">Chats vinculados</p>
          <p className="mt-1 text-xs font-bold text-zinc-500">{links.length} vinculos registrados</p>
        </div>

        {links.length === 0 ? (
          <p className="p-6 text-sm font-bold text-zinc-500">No hay chats de Telegram vinculados.</p>
        ) : (
          <div className="divide-y divide-zinc-800">
            {links.map((link) => (
              <article key={link.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-white">{link.user?.email ?? link.userId}</p>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${link.status === 'ACTIVE' ? 'bg-green-500/10 text-green-300' : 'bg-zinc-800 text-zinc-500'}`}>
                        {link.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-mono text-zinc-400 break-words">Chat ID: {link.chatId}</p>
                    {link.telegramUsername !== undefined && (
                      <p className="mt-1 text-xs font-bold text-zinc-500">@{link.telegramUsername.replace(/^@/, '')}</p>
                    )}
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                      Creado {new Date(link.createdAt).toLocaleDateString('es-CO')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onTest(link.id)}
                      disabled={saving || link.status !== 'ACTIVE'}
                      className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Enviar prueba
                    </button>
                    <button
                      onClick={() => onDisable(link.id)}
                      disabled={saving || link.status !== 'ACTIVE'}
                      className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-black text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Desactivar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TextArea({ label, value, rows, onChange }: { label: string; value: string; rows: number; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm leading-relaxed text-zinc-100 outline-none focus:border-tak-yellow"
      />
    </label>
  );
}

interface PositionedGraphNode extends KnowledgeGraphNode {
  readonly x: number;
  readonly y: number;
  readonly color: string;
}

const graphTypeConfig: Record<string, { readonly label: string; readonly color: string; readonly level: number }> = {
  provider: { label: 'Proveedor', color: '#FACC15', level: 0 },
  cloud_account: { label: 'Cuenta', color: '#38BDF8', level: 1 },
  service: { label: 'Servicio', color: '#A78BFA', level: 2 },
  resource_period: { label: 'Recurso-periodo', color: '#34D399', level: 3 },
  recommendation: { label: 'Recomendacion', color: '#FB7185', level: 4 },
  decision: { label: 'Decision', color: '#F97316', level: 5 },
  memory: { label: 'Memoria', color: '#22C55E', level: 5 },
};

function KnowledgeGraphVisual({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}: {
  readonly nodes: readonly KnowledgeGraphNode[];
  readonly edges: readonly KnowledgeGraphEdge[];
  readonly selectedNodeId: string | null;
  readonly onSelectNode: (nodeId: string) => void;
}) {
  const layout = useMemo(() => buildGraphLayout(nodes), [nodes]);
  const selectedNode = selectedNodeId !== null ? layout.nodesById.get(selectedNodeId) ?? null : null;
  const connectedNodeIds = useMemo(() => {
    if (selectedNodeId === null) {
      return new Set<string>();
    }

    const ids = new Set<string>([selectedNodeId]);
    for (const edge of edges) {
      if (edge.sourceNodeId === selectedNodeId) {
        ids.add(edge.targetNodeId);
      }
      if (edge.targetNodeId === selectedNodeId) {
        ids.add(edge.sourceNodeId);
      }
    }
    return ids;
  }, [edges, selectedNodeId]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-zinc-700">hub</span>
        <p className="mt-3 text-sm font-bold text-zinc-500">Carga el grafo completo o filtrado para visualizar las relaciones.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-tak-yellow">Grafo visual</p>
            <p className="mt-1 text-xs font-bold text-zinc-500">{nodes.length} nodos · {edges.length} relaciones</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(graphTypeConfig).slice(0, 4).map(([type, config]) => (
              <span key={type} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <span className="size-2 rounded-full" style={{ backgroundColor: config.color }}></span>
                {config.label}
              </span>
            ))}
          </div>
        </div>

        <div className="h-[640px] overflow-auto custom-scrollbar">
          <svg
            className="min-w-full"
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="img"
            aria-label="Grafo de conocimiento FinOps"
          >
            <defs>
              <filter id="graphGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {layout.levels.map((level) => (
              <g key={level.key}>
                <line x1={level.x} x2={level.x} y1="48" y2={layout.height - 48} stroke="rgba(63,63,70,0.45)" strokeDasharray="6 8" />
                <text x={level.x} y="30" textAnchor="middle" className="fill-zinc-500 text-[11px] font-black uppercase tracking-widest">
                  {level.label}
                </text>
              </g>
            ))}

            {edges.map((edge) => {
              const source = layout.nodesById.get(edge.sourceNodeId);
              const target = layout.nodesById.get(edge.targetNodeId);
              if (source === undefined || target === undefined) {
                return null;
              }

              const highlighted = selectedNodeId !== null &&
                (edge.sourceNodeId === selectedNodeId || edge.targetNodeId === selectedNodeId);

              return (
                <g key={edge.id}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={highlighted ? '#FACC15' : 'rgba(113,113,122,0.35)'}
                    strokeWidth={highlighted ? 2.5 : 1.2}
                  />
                  {highlighted && (
                    <text
                      x={(source.x + target.x) / 2}
                      y={(source.y + target.y) / 2 - 6}
                      textAnchor="middle"
                      className="fill-tak-yellow text-[10px] font-black uppercase"
                    >
                      {shortenGraphLabel(edge.relationType, 18)}
                    </text>
                  )}
                </g>
              );
            })}

            {layout.nodes.map((node) => {
              const selected = node.id === selectedNodeId;
              const connected = selectedNodeId === null || connectedNodeIds.has(node.id);

              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectNode(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      onSelectNode(node.id);
                    }
                  }}
                  className="cursor-pointer outline-none"
                  opacity={connected ? 1 : 0.28}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={selected ? 18 : 12}
                    fill={node.color}
                    fillOpacity={selected ? 1 : 0.82}
                    stroke={selected ? '#FFFFFF' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={selected ? 3 : 1}
                    filter={selected ? 'url(#graphGlow)' : undefined}
                  />
                  <text
                    x={node.x}
                    y={node.y + 30}
                    textAnchor="middle"
                    className={selected ? 'fill-white text-[12px] font-black' : 'fill-zinc-400 text-[10px] font-bold'}
                  >
                    {shortenGraphLabel(node.label, selected ? 28 : 18)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <aside className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 h-fit">
        <p className="text-xs font-black uppercase tracking-widest text-tak-yellow">Detalle del nodo</p>
        {selectedNode === null ? (
          <p className="mt-4 text-sm font-bold text-zinc-500">Selecciona un nodo del grafo.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tipo</p>
              <p className="mt-1 text-sm font-black text-white">{graphTypeConfig[selectedNode.nodeType]?.label ?? selectedNode.nodeType}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Etiqueta</p>
              <p className="mt-1 text-sm font-bold text-zinc-200 break-words">{selectedNode.label}</p>
            </div>
            {selectedNode.externalId !== undefined && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">ID externo</p>
                <p className="mt-1 text-xs font-mono text-zinc-400 break-words">{selectedNode.externalId}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Relaciones directas</p>
              <p className="mt-1 text-2xl font-black text-white">{Math.max(connectedNodeIds.size - 1, 0)}</p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function buildGraphLayout(nodes: readonly KnowledgeGraphNode[]): {
  readonly nodes: readonly PositionedGraphNode[];
  readonly nodesById: ReadonlyMap<string, PositionedGraphNode>;
  readonly levels: readonly { readonly key: string; readonly label: string; readonly x: number }[];
  readonly width: number;
  readonly height: number;
} {
  const width = 1180;
  const grouped = new Map<number, KnowledgeGraphNode[]>();

  for (const node of nodes) {
    const level = graphTypeConfig[node.nodeType]?.level ?? 6;
    grouped.set(level, [...(grouped.get(level) ?? []), node]);
  }

  const levelEntries = [...grouped.entries()].sort(([a], [b]) => a - b);
  const columnCount = Math.max(levelEntries.length, 1);
  const maxRows = Math.max(...levelEntries.map(([, levelNodes]) => levelNodes.length), 1);
  const height = Math.max(560, Math.min(2200, maxRows * 72 + 120));
  const xStep = width / (columnCount + 1);
  const positioned: PositionedGraphNode[] = [];
  const levels: { key: string; label: string; x: number }[] = [];

  levelEntries.forEach(([level, levelNodes], levelIndex) => {
    const x = xStep * (levelIndex + 1);
    const type = levelNodes[0]?.nodeType ?? `level_${level}`;
    levels.push({
      key: String(level),
      label: graphTypeConfig[type]?.label ?? `Nivel ${level}`,
      x,
    });

    const yStep = (height - 120) / (levelNodes.length + 1);

    levelNodes
      .slice()
      .sort((a, b) => a.label.localeCompare(b.label))
      .forEach((node, index) => {
        positioned.push({
          ...node,
          x,
          y: 70 + yStep * (index + 1),
          color: graphTypeConfig[node.nodeType]?.color ?? '#94A3B8',
        });
      });
  });

  return {
    nodes: positioned,
    nodesById: new Map(positioned.map((node) => [node.id, node])),
    levels,
    width,
    height,
  };
}

function shortenGraphLabel(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(1, maxLength - 1))}…`;
}
