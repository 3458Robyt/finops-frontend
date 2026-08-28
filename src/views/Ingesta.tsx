import CloudOnboarding from '../components/CloudOnboarding';
import { DataQualityPanel, IngestionHistoryPanel } from '../components/ingestion/IngestionActivityPanels';
import BillingSourcePanel from '../components/ingestion/BillingSourcePanel';
import { QueueIngestionPanel, TechnicalMetricBackfillPanel } from '../components/ingestion/IngestionControls';
import IngestionReadinessPanel from '../components/ingestion/IngestionReadinessPanel';
import ResourceLinkagePanel from '../components/ingestion/ResourceLinkagePanel';
import MetricCoveragePanel from '../components/ingestion/MetricCoveragePanel';
import { useIngestionController } from './useIngestionController';

export default function Ingesta({ canManage, onNavigate }: {
  readonly canManage: boolean;
  readonly onNavigate: (view: 'dashboard' | 'cloud_inventory' | 'metricas_tecnicas') => void;
}) {
  const controller = useIngestionController();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 lg:space-y-8">
      <header>
        <h2 className="text-2xl font-black text-white">Ingesta y calidad de datos</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Historial de trabajos de ingesta y resultados de los controles de calidad del tenant.
        </p>
      </header>

      {controller.error !== null && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-300">
          {controller.error}
        </div>
      )}
      {controller.queueMessage !== null && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm font-medium text-green-300">
          {controller.queueMessage}
        </div>
      )}

      <CloudOnboarding
        connections={controller.connections}
        canManage={canManage}
        onChanged={controller.refresh}
        onNavigate={onNavigate}
      />

      <IngestionReadinessPanel
        ok={controller.readinessOk}
        generatedAt={controller.readinessGeneratedAt}
        connections={controller.readinessConnections}
        issues={controller.readinessIssues}
        operational={controller.operationalReadiness}
        loading={controller.loading}
      />

      <MetricCoveragePanel coverage={controller.metricCoverage} loading={controller.loading} />

      {controller.resourceLinkage !== null && <ResourceLinkagePanel readiness={controller.resourceLinkage} />}

      <TechnicalMetricBackfillPanel
        connections={controller.connections}
        connectionId={controller.backfillConnectionId}
        lookbackDays={controller.backfillLookbackDays}
        windowHours={controller.backfillWindowHours}
        submitting={controller.backfilling}
        onConnectionChange={controller.setBackfillConnectionId}
        onLookbackDaysChange={controller.setBackfillLookbackDays}
        onWindowHoursChange={controller.setBackfillWindowHours}
        onSubmit={controller.handleBackfill}
      />

      <QueueIngestionPanel
        connections={controller.connections}
        connectionId={controller.cloudConnectionId}
        sourceType={controller.sourceType}
        targetStart={controller.targetStart}
        targetEnd={controller.targetEnd}
        submitting={controller.queueing}
        onConnectionChange={controller.setCloudConnectionId}
        onSourceTypeChange={controller.setSourceType}
        onTargetStartChange={controller.setTargetStart}
        onTargetEndChange={controller.setTargetEnd}
        onSubmit={controller.handleQueueJob}
      />

      <BillingSourcePanel
        connections={controller.connections}
        provider={controller.selectedFocusProvider}
        billingSourceMode={controller.billingSourceMode}
        focus={controller.focus}
        configuringBillingSource={controller.configuringBillingSource}
        configuringFocus={controller.configuringFocus}
        onBillingSourceModeChange={controller.setBillingSourceMode}
        onFocusChange={controller.handleFocusChange}
        onBillingSubmit={controller.handleConfigureBillingSource}
        onFocusSubmit={controller.handleConfigureFocus}
      />

      <IngestionHistoryPanel jobs={controller.jobs} loading={controller.loading} canManage={canManage} includeArchived={controller.includeArchived} onIncludeArchivedChange={controller.setIncludeArchived} onCancel={(jobId) => { void controller.handleCancelJob(jobId); }} onArchive={(jobId) => { void controller.handleArchiveJob(jobId); }} />
      <DataQualityPanel checks={controller.checks} loading={controller.loading} />
    </div>
  );
}
