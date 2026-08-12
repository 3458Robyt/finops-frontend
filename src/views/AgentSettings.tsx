import { useState } from 'react';
import RecommendationAnalysisRunsPanel from '../components/RecommendationAnalysisRunsPanel';
import { AgentSettingsChannels } from '../components/agent/AgentSettingsChannels';
import { AgentSettingsEvidence } from '../components/agent/AgentSettingsEvidence';
import { AgentSettingsGovernance } from '../components/agent/AgentSettingsGovernance';
import { StatusBadge } from '../components/agent/AgentSettingsUi';
import type { ApiRole } from '../services/api';
import { useAgentSettingsController } from './useAgentSettingsController';

interface AgentSettingsProps {
  readonly role: ApiRole;
  readonly onOpenRecommendation?: (recommendationId: string) => void;
}
type Tab = 'analysis' | 'governance' | 'evidence' | 'channels';

const tabs: readonly { readonly id: Tab; readonly label: string; readonly icon: string }[] = [
  { id: 'analysis', label: 'Análisis', icon: 'model_training' },
  { id: 'governance', label: 'Gobierno', icon: 'admin_panel_settings' },
  { id: 'evidence', label: 'Evidencia', icon: 'manage_search' },
  { id: 'channels', label: 'Canales', icon: 'settings_input_component' },
];

export default function AgentSettings({ role, onOpenRecommendation }: AgentSettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('analysis');
  const {
    analysisOnly,
    canConfigureAgent,
    profile,
    activeRules,
    traces,
    learningSummary,
    qualityReport,
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
    handleCreateTelegramLink,
    handleDisableTelegramLink,
    handleDeactivateMemory,
    handleTelegramTestMessage,
    handleEmailTestMessage,
    handleSendSavingsReminders,
    handleSendRecommendationSummary,
    handleSendExecutiveSummary,
  } = useAgentSettingsController(role);

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
        <AgentSettingsEvidence
          traces={traces}
          learningSummary={learningSummary}
          qualityReport={qualityReport}
          outboundDeliveryCount={outboundDeliveries.length}
          canConfigureAgent={canConfigureAgent}
          saving={saving}
          onDeactivateMemory={(memoryId) => void handleDeactivateMemory(memoryId)}
        />
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
          onSendExecutiveSummary={() => void handleSendExecutiveSummary()}
          onBackfill={() => void handleBackfill()}
        />
      )}
    </div>
  );
}
