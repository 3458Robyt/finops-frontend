import type { AgentInstructionProfile, AgentInstructionRules, TenantAgentRule } from '../../services/api';
import { Input, SectionHeader, TextArea } from './AgentSettingsUi';

interface AgentSettingsGovernanceProps {
  readonly canConfigureAgent: boolean;
  readonly saving: boolean;
  readonly profile: AgentInstructionProfile | null;
  readonly form: { readonly objective: string; readonly tone: string; readonly recommendationPriorities: string; readonly evidenceRequirements: string; readonly riskPolicy: string; readonly forbiddenActions: string; readonly freeformNotes: string };
  readonly ruleForm: { readonly category: string; readonly ruleText: string; readonly priority: string };
  readonly activeRules: readonly TenantAgentRule[];
  readonly onFormChange: (form: AgentSettingsGovernanceProps['form']) => void;
  readonly onRuleFormChange: (form: AgentSettingsGovernanceProps['ruleForm']) => void;
  readonly onActivateProfile: () => void;
  readonly onCreateRule: () => void;
  readonly onDisableRule: (ruleId: string) => void;
}

export function AgentSettingsGovernance({ canConfigureAgent, saving, profile, form, ruleForm, activeRules, onFormChange, onRuleFormChange, onActivateProfile, onCreateRule, onDisableRule }: AgentSettingsGovernanceProps) {
  const updateForm = (key: keyof AgentSettingsGovernanceProps['form'], value: string) => onFormChange({ ...form, [key]: value });

  return <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
    <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
      <SectionHeader title="Perfil activo del agente" eyebrow={`Version ${profile?.version ?? '-'}`} icon="psychology" />
      <TextArea label="Objetivo principal" value={form.objective} rows={3} onChange={(value) => updateForm('objective', value)} />
      <TextArea label="Tono y estilo" value={form.tone} rows={3} onChange={(value) => updateForm('tone', value)} />
      <TextArea label="Prioridades de recomendacion" value={form.recommendationPriorities} rows={5} onChange={(value) => updateForm('recommendationPriorities', value)} />
      <TextArea label="Evidencia requerida" value={form.evidenceRequirements} rows={5} onChange={(value) => updateForm('evidenceRequirements', value)} />
      <TextArea label="Politica de riesgo" value={form.riskPolicy} rows={4} onChange={(value) => updateForm('riskPolicy', value)} />
      <TextArea label="Acciones prohibidas" value={form.forbiddenActions} rows={4} onChange={(value) => updateForm('forbiddenActions', value)} />
      <TextArea label="Notas administrativas" value={form.freeformNotes} rows={4} onChange={(value) => updateForm('freeformNotes', value)} />
      {canConfigureAgent && <button onClick={onActivateProfile} disabled={saving} className="rounded-lg bg-tak-yellow px-5 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:opacity-60">Activar perfil validado</button>}
    </div>

    <div className="space-y-4">
      {canConfigureAgent && <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5"><SectionHeader title="Nueva regla tenant" eyebrow="Contexto local" icon="add_task" /><Input label="Categoria" value={ruleForm.category} onChange={(value) => onRuleFormChange({ ...ruleForm, category: value })} /><Input label="Prioridad" value={ruleForm.priority} onChange={(value) => onRuleFormChange({ ...ruleForm, priority: value })} /><TextArea label="Regla del cliente" value={ruleForm.ruleText} rows={5} onChange={(value) => onRuleFormChange({ ...ruleForm, ruleText: value })} /><button onClick={onCreateRule} disabled={saving} className="w-full rounded-lg bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:opacity-60">Agregar regla</button></div>}
      <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5"><SectionHeader title="Reglas activas" eyebrow="Tenant" icon="rule" />{activeRules.length === 0 ? <p className="text-sm font-bold text-zinc-500">No hay reglas activas del cliente.</p> : activeRules.map((rule) => <article key={rule.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-tak-yellow">{rule.category} - prioridad {rule.priority}</p><p className="mt-2 text-sm leading-relaxed text-zinc-200">{rule.ruleText}</p>{canConfigureAgent && <button onClick={() => onDisableRule(rule.id)} disabled={saving} className="mt-3 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-400 hover:text-white disabled:opacity-60">Desactivar</button>}</article>)}</div>
    </div>
  </section>;
}

export type AgentInstructionForm = AgentSettingsGovernanceProps['form'];
export type AgentRuleForm = AgentSettingsGovernanceProps['ruleForm'];
export type { AgentInstructionRules };
